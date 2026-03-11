"""
Session Manager — Cross-clip correlation for continuous video streams

The mobile app records 3-second clips and uploads them asynchronously.
Each clip arrives independently. This module links consecutive clips
from the same source/location and accumulates evidence across clips
to produce better incident detection with fewer false positives and
no duplicate reports.

How it works:
  1. Each analysis request includes a session key (user_id or device_id + GPS).
  2. The session stores a rolling window of recent clip results.
  3. Evidence from multiple clips is combined:
     - Fire detected in 3 consecutive clips → HIGH confidence fire
     - Single clip fire → wait for confirmation (suppress until confirmed)
     - Accident signals across 2+ clips → confirmed accident
  4. Once an incident is CONFIRMED and reported, the session enters a
     cooldown period so the same incident is not reported again.
  5. Sessions auto-expire after inactivity (no new clips for 5 minutes).

This runs entirely in-memory in the AI service process.
"""

import time
import threading
from typing import Dict, Any, Optional, List
from collections import defaultdict
import math


class AnalysisSession:
    """Tracks state for a single continuous monitoring stream."""
    
    __slots__ = [
        'session_id', 'created_at', 'last_activity',
        'clip_results', 'confirmed_incident', 'cooldown_types',
        'clip_count', 'last_location',
    ]
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.created_at = time.time()
        self.last_activity = time.time()
        self.clip_results: List[Dict[str, Any]] = []  # Rolling window of recent results
        self.confirmed_incident: Optional[Dict[str, Any]] = None  # Last confirmed
        self.cooldown_types: Dict[str, float] = {}  # type → cooldown_until timestamp
        self.clip_count: int = 0
        self.last_location: Optional[Dict[str, float]] = None
    
    def add_clip_result(self, result: Dict[str, Any], latitude: float = None, longitude: float = None):
        """Add a single clip analysis result to the session."""
        self.last_activity = time.time()
        self.clip_count += 1
        
        entry = {
            'timestamp': time.time(),
            'clip_number': self.clip_count,
            'incident_type': result.get('incident_type', 'none'),
            'incident_detected': result.get('incident_detected', False),
            'confidence': result.get('confidence', 0),
            'severity': result.get('severity', 'none'),
            'fire_frames': result.get('fire_frames', 0),
            'fire_percentage': result.get('fire_percentage', 0),
            'avg_vehicles': result.get('avg_vehicles', 0),
            'vehicles_detected': result.get('vehicles_detected', 0),
            'collision_indicators': result.get('collision_indicators', 0),
            'description': result.get('description', ''),
        }
        
        self.clip_results.append(entry)
        
        # Keep rolling window of last 10 clips (~30 seconds of footage)
        if len(self.clip_results) > 10:
            self.clip_results = self.clip_results[-10:]
        
        if latitude is not None and longitude is not None:
            self.last_location = {'latitude': latitude, 'longitude': longitude}
    
    def is_in_cooldown_for(self, incident_type: str) -> bool:
        """Check if this incident type is in cooldown."""
        until = self.cooldown_types.get(incident_type, 0)
        return time.time() < until
    
    @property
    def is_in_cooldown(self) -> bool:
        """Check if ANY incident type is in cooldown (for stats)."""
        now = time.time()
        return any(now < t for t in self.cooldown_types.values())
    
    @property
    def recent_window(self) -> List[Dict[str, Any]]:
        """Get clips from the last 30 seconds."""
        cutoff = time.time() - 30
        return [c for c in self.clip_results if c['timestamp'] >= cutoff]
    
    def enter_cooldown(self, incident_type: str, seconds: int = 120):
        """Enter cooldown for a specific incident type."""
        self.cooldown_types[incident_type] = time.time() + seconds


class SessionManager:
    """
    Manages all active analysis sessions and provides cross-clip
    correlation to produce better incident detection.
    """
    
    # Session expiry (no new clips for this long = session dies)
    SESSION_TIMEOUT_SECONDS = 300  # 5 minutes
    
    # Cooldown after confirmed incident (same session won't re-report)
    INCIDENT_COOLDOWN_SECONDS = 120  # 2 minutes
    
    # Minimum consecutive clips to confirm an incident
    MIN_CLIPS_TO_CONFIRM = {
        'fire': 2,       # Fire: 2 clips (~6 sec) for confirmation
        'accident': 3,   # Accident: 3 clips (~9 sec) — raised from 2 to reduce false positives
        'traffic_jam': 3, # Traffic jam: 3 clips (~9 sec) — raised from 2
        'congestion': 3,  # Congestion: 3 clips (higher bar, less urgent)
    }
    
    # GPS distance threshold to consider same location (meters)
    SAME_LOCATION_RADIUS = 150
    
    def __init__(self):
        self._sessions: Dict[str, AnalysisSession] = {}
        self._lock = threading.Lock()
        
        # Start background cleanup thread
        self._cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self._cleanup_thread.start()
    
    def _cleanup_loop(self):
        """Periodically remove expired sessions."""
        while True:
            time.sleep(60)  # Check every minute
            self._cleanup_expired()
    
    def _cleanup_expired(self):
        """Remove sessions that haven't received clips recently."""
        now = time.time()
        with self._lock:
            expired = [
                sid for sid, sess in self._sessions.items()
                if (now - sess.last_activity) > self.SESSION_TIMEOUT_SECONDS
            ]
            for sid in expired:
                del self._sessions[sid]
            if expired:
                print(f"🧹 Cleaned up {len(expired)} expired sessions "
                      f"({len(self._sessions)} active)")
    
    def get_or_create_session(self, session_id: str) -> AnalysisSession:
        """Get existing session or create new one."""
        with self._lock:
            if session_id not in self._sessions:
                self._sessions[session_id] = AnalysisSession(session_id)
                print(f"📱 New session: {session_id}")
            return self._sessions[session_id]
    
    def build_session_key(self, user_id: str = None, device_id: str = None,
                          latitude: float = None, longitude: float = None) -> str:
        """
        Build a session key from available identifiers.
        
        Priority: user_id > device_id, combined with GPS grid cell.
        The GPS grid groups nearby clips together even if exact coords vary slightly.
        """
        # Identity part
        identity = user_id or device_id or 'anonymous'
        
        # Location grid: ~100m cells
        if latitude is not None and longitude is not None:
            lat_grid = round(latitude * 100) / 100  # ~1.1km grid
            lon_grid = round(longitude * 100) / 100
            return f"{identity}_{lat_grid}_{lon_grid}"
        
        return f"{identity}_noloc"
    
    def correlate_and_decide(self, session: AnalysisSession,
                              single_clip_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Core logic: Combine single-clip result with session history
        to decide whether to REPORT, SUPPRESS, or UPGRADE the incident.
        
        Returns the final result dict with additional fields:
          - session_action: 'report' | 'suppress' | 'update' | 'none'
          - session_confidence: Correlated confidence (may be higher than single clip)
          - session_incident_type: Final incident type after correlation
          - is_duplicate: True if this is a repeat of already-reported incident
          - clip_number: Which clip this is in the session
        """
        incident_type = single_clip_result.get('incident_type', 'none')
        incident_detected = single_clip_result.get('incident_detected', False)
        confidence = single_clip_result.get('confidence', 0)
        
        # Start with the single-clip result as base
        result = dict(single_clip_result)
        result['clip_number'] = session.clip_count
        result['session_id'] = session.session_id
        result['session_clips_total'] = session.clip_count
        
        # === CASE 1: No incident in this clip ===
        if not incident_detected or incident_type in ('none', 'normal', 'error'):
            # Check if recent clips had incidents (incident may have ended)
            recent = session.recent_window
            recent_incidents = [c for c in recent if c['incident_detected']]
            
            if len(recent_incidents) == 0:
                # No recent incidents either — all clear
                result['session_action'] = 'none'
                result['session_confidence'] = 0
                result['session_incident_type'] = 'none'
                result['is_duplicate'] = False
                return result
            else:
                # Had recent incidents but this clip is clear.
                # Don't immediately cancel — could be a brief gap.
                # But don't report anything new either.
                result['session_action'] = 'none'
                result['session_confidence'] = 0
                result['session_incident_type'] = 'none'
                result['is_duplicate'] = False
                return result
        
        # === CASE 2: Incident detected but session is in cooldown for THIS type ===
        if session.is_in_cooldown_for(incident_type):
            # Same incident type already reported — suppress duplicate
            result['session_action'] = 'suppress'
            result['session_confidence'] = confidence
            result['session_incident_type'] = incident_type
            result['is_duplicate'] = True
            result['incident_detected'] = False  # Override — don't create new report
            remaining = int(session.cooldown_types.get(incident_type, 0) - time.time())
            result['suppression_reason'] = (
                f"Same {incident_type} already reported "
                f"{remaining}s cooldown remaining"
            )
            return result
        
        # === CASE 3: Incident detected — check cross-clip confirmation ===
        recent = session.recent_window
        
        # Count how many recent clips detected the SAME incident type
        same_type_clips = [
            c for c in recent
            if c['incident_detected'] and c['incident_type'] == incident_type
        ]
        # Include current clip
        consecutive_count = len(same_type_clips)  # Current clip is already in recent_window
        
        min_required = self.MIN_CLIPS_TO_CONFIRM.get(incident_type, 2)
        
        if consecutive_count >= min_required:
            # === CONFIRMED: Multiple clips agree → REPORT ===
            
            # Boost confidence based on cross-clip agreement
            avg_confidence = sum(c['confidence'] for c in same_type_clips) / len(same_type_clips)
            boosted_confidence = min(0.95, avg_confidence + 0.05 * (consecutive_count - 1))
            
            # Pick strongest severity from recent clips
            severity_order = {'critical': 4, 'high': 3, 'medium': 2, 'low': 1, 'none': 0}
            best_severity = max(
                [c.get('severity', 'medium') for c in same_type_clips],
                key=lambda s: severity_order.get(s, 0)
            )
            
            # Aggregate vehicle counts
            max_vehicles = max(c.get('vehicles_detected', 0) for c in same_type_clips)
            avg_vehicles = sum(c.get('avg_vehicles', 0) for c in same_type_clips) / len(same_type_clips)
            
            result['session_action'] = 'report'
            result['session_confidence'] = round(boosted_confidence, 2)
            result['session_incident_type'] = incident_type
            result['is_duplicate'] = False
            result['confidence'] = round(boosted_confidence, 2)
            result['severity'] = best_severity
            result['vehicles_detected'] = max_vehicles
            result['avg_vehicles'] = round(avg_vehicles, 1)
            result['cross_clip_evidence'] = consecutive_count
            result['description'] = (
                f"{result.get('description', '')} "
                f"[Confirmed across {consecutive_count} clips over "
                f"{int(time.time() - same_type_clips[0]['timestamp'])}s]"
            )
            
            # Enter cooldown so subsequent clips don't re-report this type
            session.confirmed_incident = {
                'type': incident_type,
                'severity': best_severity,
                'confidence': boosted_confidence,
                'confirmed_at': time.time(),
                'clips_used': consecutive_count,
            }
            session.enter_cooldown(incident_type, self.INCIDENT_COOLDOWN_SECONDS)
            
            return result
        
        else:
            # === NOT YET CONFIRMED: Detected but need more clips ===
            # First clip of potential incident — hold, don't report yet
            # EXCEPTION: Very high confidence single-clip (≥0.95) for critical types
            # This is rare — only triggers for extremely clear fire/accident frames
            if confidence >= 0.95 and incident_type in ('fire', 'accident'):
                # High confidence + critical type → report immediately
                result['session_action'] = 'report'
                result['session_confidence'] = confidence
                result['session_incident_type'] = incident_type
                result['is_duplicate'] = False
                result['cross_clip_evidence'] = consecutive_count
                result['description'] = (
                    f"{result.get('description', '')} "
                    f"[High-confidence single clip detection]"
                )
                
                session.confirmed_incident = {
                    'type': incident_type,
                    'severity': result.get('severity', 'high'),
                    'confidence': confidence,
                    'confirmed_at': time.time(),
                    'clips_used': 1,
                }
                session.enter_cooldown(incident_type, self.INCIDENT_COOLDOWN_SECONDS)
                return result
            
            # Otherwise suppress — wait for confirmation from next clip
            result['session_action'] = 'pending'
            result['session_confidence'] = confidence
            result['session_incident_type'] = incident_type
            result['is_duplicate'] = False
            result['incident_detected'] = False  # Don't report yet
            result['pending_confirmation'] = True
            result['clips_so_far'] = consecutive_count
            result['clips_needed'] = min_required
            result['description'] = (
                f"Potential {incident_type} detected — awaiting confirmation "
                f"({consecutive_count}/{min_required} clips)"
            )
            return result
    
    def process_clip(self, analyzer, video_path: str,
                     user_id: str = None, device_id: str = None,
                     clip_id: str = None,
                     latitude: float = None, longitude: float = None) -> Dict[str, Any]:
        """
        Full pipeline: Analyze a single clip and correlate with session history.
        
        This is the main entry point called by the API endpoint.
        
        Returns enriched result with session correlation.
        """
        # Step 1: Run single-clip analysis
        raw_result = analyzer.analyze_video(video_path)
        
        # Step 2: Get/create session
        session_key = self.build_session_key(user_id, device_id, latitude, longitude)
        session = self.get_or_create_session(session_key)
        
        # Step 3: Add result to session
        session.add_clip_result(raw_result, latitude, longitude)
        
        # Step 4: Cross-clip correlation
        final_result = self.correlate_and_decide(session, raw_result)
        
        # Log
        action = final_result.get('session_action', '?')
        itype = final_result.get('session_incident_type', 'none')
        clip_n = final_result.get('clip_number', 0)
        
        if action == 'report':
            evidence = final_result.get('cross_clip_evidence', 1)
            print(f"🚨 [{session_key}] clip#{clip_n}: REPORT {itype} "
                  f"(confirmed across {evidence} clips)")
        elif action == 'suppress':
            print(f"🔇 [{session_key}] clip#{clip_n}: SUPPRESS {itype} (cooldown)")
        elif action == 'pending':
            needed = final_result.get('clips_needed', 2)
            sofar = final_result.get('clips_so_far', 1)
            print(f"⏳ [{session_key}] clip#{clip_n}: PENDING {itype} ({sofar}/{needed})")
        elif action == 'none':
            print(f"✅ [{session_key}] clip#{clip_n}: clear")
        
        return final_result
    
    @property
    def active_session_count(self) -> int:
        return len(self._sessions)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get session manager statistics."""
        with self._lock:
            active = len(self._sessions)
            in_cooldown = sum(1 for s in self._sessions.values() if s.is_in_cooldown)
            total_clips = sum(s.clip_count for s in self._sessions.values())
            confirmed = sum(1 for s in self._sessions.values() if s.confirmed_incident)
        
        return {
            'active_sessions': active,
            'sessions_in_cooldown': in_cooldown,
            'total_clips_processed': total_clips,
            'confirmed_incidents': confirmed,
        }


def _haversine_meters(lat1, lon1, lat2, lon2) -> float:
    """Distance between two GPS points in meters."""
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (math.sin(dphi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# Singleton instance
session_manager = SessionManager()
