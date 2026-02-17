"""
Lightweight Traffic Analyzer
Uses OpenCV's built-in detection (no PyTorch/YOLO needed)
~50MB dependencies instead of ~900MB
"""

import cv2
import numpy as np
from typing import Dict, Any, List, Optional
import os
from datetime import datetime


class LightweightTrafficAnalyzer:
    """
    Traffic analysis using OpenCV only - no heavy ML frameworks needed.
    Uses background subtraction, contour detection, and motion analysis.
    """
    
    def __init__(self):
        self.min_vehicle_area = 1500  # Minimum contour area to be considered a vehicle
        self.max_vehicle_area = 50000  # Maximum contour area
        self.motion_threshold = 25
        self.bg_subtractor = cv2.createBackgroundSubtractorMOG2(
            history=500, varThreshold=50, detectShadows=True
        )
        
    def analyze_video(self, video_path: str) -> Dict[str, Any]:
        """
        Analyze video for traffic incidents using OpenCV
        """
        if not os.path.exists(video_path):
            return self._error_response("Video file not found")
        
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                return self._error_response("Could not open video")
            
            # Video properties
            fps = cap.get(cv2.CAP_PROP_FPS) or 30
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = frame_count / fps if fps > 0 else 0
            
            # Analysis results
            all_vehicle_counts = []
            motion_scores = []
            stopped_vehicle_frames = 0
            high_density_frames = 0
            collision_indicators = 0
            
            # Sample every nth frame for efficiency
            sample_interval = max(1, int(fps / 3))  # ~3 frames per second
            frame_idx = 0
            prev_centroids = []
            
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                if frame_idx % sample_interval == 0:
                    # Analyze frame
                    analysis = self._analyze_frame(frame, prev_centroids)
                    
                    all_vehicle_counts.append(analysis['vehicle_count'])
                    motion_scores.append(analysis['motion_score'])
                    prev_centroids = analysis['centroids']
                    
                    # Check for incident indicators
                    if analysis['stopped_vehicles'] > 2:
                        stopped_vehicle_frames += 1
                    if analysis['vehicle_count'] > 8:
                        high_density_frames += 1
                    if analysis['sudden_stop']:
                        collision_indicators += 1
                
                frame_idx += 1
            
            cap.release()
            
            # Determine incident type and severity
            return self._determine_incident(
                all_vehicle_counts,
                motion_scores,
                stopped_vehicle_frames,
                high_density_frames,
                collision_indicators,
                duration
            )
            
        except Exception as e:
            return self._error_response(str(e))
    
    def _analyze_frame(self, frame: np.ndarray, prev_centroids: List) -> Dict[str, Any]:
        """Analyze a single frame"""
        # Resize for faster processing
        scale = 0.5
        small_frame = cv2.resize(frame, None, fx=scale, fy=scale)
        
        # Apply background subtraction
        fg_mask = self.bg_subtractor.apply(small_frame)
        
        # Remove shadows (marked as 127 in MOG2)
        fg_mask[fg_mask == 127] = 0
        
        # Morphological operations to clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
        
        # Find contours (potential vehicles)
        contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        vehicles = []
        centroids = []
        
        for contour in contours:
            area = cv2.contourArea(contour) / (scale ** 2)  # Scale back to original
            
            if self.min_vehicle_area < area < self.max_vehicle_area:
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = w / h if h > 0 else 0
                
                # Filter by aspect ratio (vehicles are typically wider than tall)
                if 0.3 < aspect_ratio < 4.0:
                    vehicles.append({
                        'area': area,
                        'bbox': (x, y, w, h),
                        'centroid': (x + w//2, y + h//2)
                    })
                    centroids.append((x + w//2, y + h//2))
        
        # Calculate motion score
        motion_score = np.sum(fg_mask > 0) / fg_mask.size
        
        # Detect stopped vehicles (centroids that haven't moved much)
        stopped_count = 0
        sudden_stop = False
        
        if prev_centroids:
            for curr in centroids:
                min_dist = float('inf')
                for prev in prev_centroids:
                    dist = np.sqrt((curr[0] - prev[0])**2 + (curr[1] - prev[1])**2)
                    min_dist = min(min_dist, dist)
                
                if min_dist < 10:  # Vehicle hasn't moved much
                    stopped_count += 1
            
            # Check for sudden stops (many vehicles stopping at once)
            if stopped_count > len(centroids) * 0.7 and len(centroids) > 3:
                sudden_stop = True
        
        return {
            'vehicle_count': len(vehicles),
            'motion_score': motion_score,
            'centroids': centroids,
            'stopped_vehicles': stopped_count,
            'sudden_stop': sudden_stop
        }
    
    def _determine_incident(
        self,
        vehicle_counts: List[int],
        motion_scores: List[float],
        stopped_frames: int,
        high_density_frames: int,
        collision_indicators: int,
        duration: float
    ) -> Dict[str, Any]:
        """Determine incident type and severity from analysis"""
        
        if not vehicle_counts:
            return {
                "success": True,
                "incident_detected": False,
                "incident_type": "normal",
                "severity": "low",
                "confidence": 0.5,
                "vehicles_detected": 0,
                "description": "No activity detected"
            }
        
        avg_vehicles = sum(vehicle_counts) / len(vehicle_counts)
        max_vehicles = max(vehicle_counts)
        avg_motion = sum(motion_scores) / len(motion_scores)
        total_frames = len(vehicle_counts)
        
        # Decision logic
        incident_type = "normal"
        severity = "low"
        confidence = 0.6
        description = "Normal traffic flow"
        incident_detected = False
        
        # Check for collision/accident
        if collision_indicators >= 2 or (stopped_frames > total_frames * 0.4 and avg_vehicles > 3):
            incident_type = "accident"
            severity = "high" if collision_indicators >= 3 else "medium"
            confidence = min(0.85, 0.6 + collision_indicators * 0.1)
            description = f"Potential accident detected - {int(stopped_frames)} frames with stopped vehicles"
            incident_detected = True
        
        # Check for congestion
        elif high_density_frames > total_frames * 0.3 or avg_vehicles > 6:
            incident_type = "congestion"
            if avg_vehicles > 10:
                severity = "high"
                confidence = 0.8
            elif avg_vehicles > 7:
                severity = "medium"
                confidence = 0.75
            else:
                severity = "low"
                confidence = 0.7
            description = f"Traffic congestion - average {avg_vehicles:.1f} vehicles detected"
            incident_detected = True
        
        # Check for road blockage (vehicles stopped, low motion)
        elif stopped_frames > total_frames * 0.5 and avg_motion < 0.05:
            incident_type = "roadblock"
            severity = "medium"
            confidence = 0.7
            description = "Possible road blockage - vehicles stationary"
            incident_detected = True
        
        # Normal traffic with activity
        elif avg_vehicles > 0:
            incident_type = "normal"
            severity = "low"
            confidence = 0.85
            description = f"Normal traffic - {avg_vehicles:.1f} vehicles average"
            incident_detected = True
        
        return {
            "success": True,
            "incident_detected": incident_detected,
            "incident_type": incident_type,
            "severity": severity,
            "confidence": float(confidence),
            "vehicles_detected": int(max_vehicles),
            "avg_vehicles": float(avg_vehicles),
            "duration_seconds": float(duration),
            "frames_analyzed": int(total_frames),
            "description": description,
            "analysis_timestamp": datetime.now().isoformat()
        }
    
    def _error_response(self, error: str) -> Dict[str, Any]:
        """Return error response"""
        return {
            "success": False,
            "incident_detected": False,
            "incident_type": "error",
            "severity": "low",
            "confidence": 0.0,
            "vehicles_detected": 0,
            "error": error
        }
    
    def analyze_image(self, image_path: str) -> Dict[str, Any]:
        """Analyze a single image"""
        if not os.path.exists(image_path):
            return self._error_response("Image file not found")
        
        try:
            frame = cv2.imread(image_path)
            if frame is None:
                return self._error_response("Could not read image")
            
            # Simple edge-based vehicle detection for images
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            edges = cv2.Canny(blurred, 50, 150)
            
            # Find contours
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            vehicle_count = 0
            for contour in contours:
                area = cv2.contourArea(contour)
                if self.min_vehicle_area < area < self.max_vehicle_area:
                    x, y, w, h = cv2.boundingRect(contour)
                    aspect_ratio = w / h if h > 0 else 0
                    if 0.3 < aspect_ratio < 4.0:
                        vehicle_count += 1
            
            # Determine congestion based on vehicle count
            if vehicle_count > 10:
                return {
                    "success": True,
                    "incident_detected": True,
                    "incident_type": "congestion",
                    "severity": "high",
                    "confidence": 0.7,
                    "vehicles_detected": vehicle_count,
                    "description": f"Heavy traffic - {vehicle_count} vehicles detected"
                }
            elif vehicle_count > 5:
                return {
                    "success": True,
                    "incident_detected": True,
                    "incident_type": "congestion",
                    "severity": "medium",
                    "confidence": 0.65,
                    "vehicles_detected": vehicle_count,
                    "description": f"Moderate traffic - {vehicle_count} vehicles detected"
                }
            else:
                return {
                    "success": True,
                    "incident_detected": False,
                    "incident_type": "normal",
                    "severity": "low",
                    "confidence": 0.8,
                    "vehicles_detected": vehicle_count,
                    "description": f"Normal traffic - {vehicle_count} vehicles detected"
                }
                
        except Exception as e:
            return self._error_response(str(e))


# Create singleton instance
analyzer = LightweightTrafficAnalyzer()
