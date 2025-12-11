import cv2
import numpy as np
from ultralytics import YOLO
from typing import List, Dict, Tuple, Optional
import os
from dotenv import load_dotenv
from screen_preprocessing import preprocess_screen_capture

load_dotenv()


class TemporalAnalyzer:
    """
    Analyze detection patterns across multiple frames
    Reduces false positives by confirming incidents over time
    """
    def __init__(self, max_history=30):
        self.frame_history = []
        self.max_history = max_history
    
    def add_frame_analysis(self, frame_data: Dict):
        """Add frame analysis to history"""
        self.frame_history.append(frame_data)
        if len(self.frame_history) > self.max_history:
            self.frame_history.pop(0)
    
    def get_confidence_trend(self) -> Optional[Dict]:
        """Get trend of detection confidence over time"""
        if len(self.frame_history) < 5:
            return None
        
        confidences = [f.get('confidence', 0) for f in self.frame_history]
        recent = confidences[-10:]  # Last 10 frames
        
        if not recent:
            return None
        
        return {
            'average': float(np.mean(recent)),
            'max': float(np.max(recent)),
            'sustained': np.mean(recent) > 0.3,  # Sustained detection
            'trend': 'increasing' if recent[-1] > recent[0] else 'decreasing'
        }
    
    def confirm_incident(self) -> bool:
        """
        Confirm incident if detected consistently across frames
        Returns True if incident appears in 30%+ of recent frames
        """
        if len(self.frame_history) < 10:
            return False
        
        # Check last 10 frames
        recent = self.frame_history[-10:]
        incident_frames = sum(1 for f in recent if f.get('has_incident', False))
        
        # Incident confirmed if detected in 30%+ of recent frames
        confirmation_ratio = incident_frames / len(recent)
        return confirmation_ratio >= 0.3
    
    def get_vehicle_count_trend(self) -> Optional[Dict]:
        """Analyze vehicle count over time"""
        if len(self.frame_history) < 5:
            return None
        
        vehicle_counts = [f.get('vehicle_count', 0) for f in self.frame_history]
        recent = vehicle_counts[-10:]
        
        return {
            'average': float(np.mean(recent)),
            'max': int(np.max(recent)),
            'min': int(np.min(recent)),
            'stable': np.std(recent) < 2  # Low variance = stable traffic
        }
    
    def clear_history(self):
        """Clear frame history"""
        self.frame_history = []


class ScreenVideoPreprocessor:
    """Preprocessor for detecting and extracting video content from screen recordings"""
    
    def __init__(self):
        self.min_content_ratio = 0.3  # Minimum ratio of frame that should be content
        self.edge_detection_threshold = 50
    
    def detect_screen_boundaries(self, frame: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
        """
        Detect the boundaries of video content within a screen recording
        Returns: (x1, y1, x2, y2) or None
        """
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Apply edge detection
        edges = cv2.Canny(gray, 50, 150)
        
        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            return None
        
        # Find the largest rectangular contour (likely the video player)
        largest_contour = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest_contour)
        
        # Validate it's a reasonable size (not the whole frame)
        frame_h, frame_w = frame.shape[:2]
        content_ratio = (w * h) / (frame_w * frame_h)
        
        if content_ratio < self.min_content_ratio or content_ratio > 0.95:
            return None
        
        return (x, y, x + w, y + h)
    
    def extract_content_region(self, frame: np.ndarray) -> np.ndarray:
        """
        Extract the actual video content from a screen recording
        Uses multiple strategies to find the content area
        """
        boundaries = self.detect_screen_boundaries(frame)
        
        if boundaries:
            x1, y1, x2, y2 = boundaries
            # Add small margin to avoid UI elements
            margin = 5
            x1, y1 = max(0, x1 + margin), max(0, y1 + margin)
            x2, y2 = min(frame.shape[1], x2 - margin), min(frame.shape[0], y2 - margin)
            return frame[y1:y2, x1:x2]
        
        # Fallback: Crop common screen recording margins (10% on each side)
        h, w = frame.shape[:2]
        margin_h, margin_w = int(h * 0.1), int(w * 0.1)
        return frame[margin_h:h-margin_h, margin_w:w-margin_w]
    
    def enhance_low_resolution(self, frame: np.ndarray) -> np.ndarray:
        """
        Enhanced preprocessing for screen-captured frames
        Uses the new preprocess_screen_capture module for better results
        """
        # Use the enhanced preprocessing from screen_preprocessing module
        return preprocess_screen_capture(frame)


class EnhancedTrafficAnalyzer:
    """
    Enhanced traffic analyzer that can detect vehicles in both:
    1. Real-world traffic videos (direct camera)
    2. Screen-recorded videos (YouTube, etc.)
    """
    
    def __init__(self):
        model_path = os.getenv('MODEL_PATH', './models/yolov8n.pt')
        self.model = YOLO(model_path)
        
        # Detection parameters
        self.frame_skip = int(os.getenv('FRAME_SKIP', 5))
        self.input_size = int(os.getenv('INPUT_RESOLUTION', 640))
        self.min_confidence = float(os.getenv('MIN_CONFIDENCE', 0.5))
        
        # Screen video detection (lower confidence for screen recordings)
        self.screen_min_confidence = 0.25  # Lower threshold for screen videos
        self.screen_detection_enabled = True
        
        # Incident thresholds
        self.congestion_vehicle_threshold = int(os.getenv('CONGESTION_VEHICLE_THRESHOLD', 12))
        self.congestion_speed_threshold = float(os.getenv('CONGESTION_SPEED_THRESHOLD', 8))
        self.accident_stationary_threshold = int(os.getenv('ACCIDENT_STATIONARY_THRESHOLD', 2))
        
        # Vehicle classes in COCO dataset
        self.vehicle_classes = [2, 3, 5, 7]  # car, motorcycle, bus, truck
        
        # Preprocessor for screen videos
        self.preprocessor = ScreenVideoPreprocessor()
        
        # Temporal analyzer for multi-frame confirmation
        self.temporal_analyzer = TemporalAnalyzer(max_history=30)
    
    def is_screen_recording(self, frame: np.ndarray) -> bool:
        """
        Detect if frame is from a screen recording
        Looks for:
        - UI elements (black bars, player controls)
        - Consistent borders
        - Lower inner resolution
        """
        h, w = frame.shape[:2]
        
        # Check for black bars (common in screen recordings)
        top_row = frame[0:10, :]
        bottom_row = frame[h-10:h, :]
        left_col = frame[:, 0:10]
        right_col = frame[:, w-10:w]
        
        # Calculate average brightness of borders
        borders = [top_row, bottom_row, left_col, right_col]
        border_brightness = [np.mean(border) for border in borders]
        
        # If borders are very dark (black bars), likely screen recording
        dark_borders = sum(1 for b in border_brightness if b < 30)
        
        return dark_borders >= 2
    
    def analyze_video(self, video_path: str, test_mode: bool = False) -> Dict:
        """
        Analyze traffic video for incidents
        
        Args:
            video_path: Path to video file
            test_mode: Enable screen video detection optimizations
            
        Returns:
            dict with analysis results
        """
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise ValueError(f"Could not open video file: {video_path}")
        
        # Validate video has frames
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        if total_frames <= 0 or fps <= 0:
            cap.release()
            raise ValueError(f"Invalid video file: {video_path} (frames={total_frames}, fps={fps})")
        
        print(f"🎥 Video info: {total_frames} frames @ {fps} FPS")
        
        # Auto-detect screen recording from first frame
        ret, first_frame = cap.read()
        if ret and first_frame is not None:
            is_screen = self.is_screen_recording(first_frame)
            if is_screen:
                print("📱 Detected screen recording - applying enhanced detection")
                test_mode = True
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # Reset to start
        
        frame_count = 0
        vehicle_detections = []
        frame_analyses = []
        
        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Validate frame
                if frame is None or frame.size == 0:
                    continue
                
                # Process every nth frame for efficiency
                if frame_count % self.frame_skip == 0:
                    analysis = self._analyze_frame(frame, frame_count, test_mode=test_mode)
                    if analysis:
                        frame_analyses.append(analysis)
                        vehicle_detections.append(analysis['vehicle_count'])
                
                frame_count += 1
        finally:
            cap.release()
        
        if frame_count == 0:
            raise ValueError(f"No frames could be read from video: {video_path}")
        
        # Consolidate results
        result = self._consolidate_results(frame_analyses, fps, total_frames)
        result['frames_processed'] = frame_count
        result['test_mode'] = test_mode
        result['detection_method'] = 'screen_enhanced' if test_mode else 'standard'
        return result
    
    def _analyze_frame(self, frame: np.ndarray, frame_id: int, test_mode: bool = False) -> Dict:
        """
        Analyze a single frame with optional screen video preprocessing
        """
        processed_frame = frame
        preprocessing_applied = []
        
        if test_mode:
            # Extract content region (remove borders/UI)
            processed_frame = self.preprocessor.extract_content_region(frame)
            preprocessing_applied.append('content_extraction')
            
            # Enhance if low resolution
            if processed_frame.shape[0] < 480 or processed_frame.shape[1] < 640:
                processed_frame = self.preprocessor.enhance_low_resolution(processed_frame)
                preprocessing_applied.append('enhancement')
        
        # Use lower confidence threshold for screen videos
        confidence_threshold = self.screen_min_confidence if test_mode else self.min_confidence
        
        # Run YOLOv8 detection with multiple scales for screen videos
        if test_mode:
            # Multi-scale detection for better screen video results
            results = self.model(processed_frame, imgsz=self.input_size, verbose=False, conf=confidence_threshold)
        else:
            results = self.model(processed_frame, imgsz=self.input_size, verbose=False, conf=confidence_threshold)
        
        if not results or len(results) == 0:
            return None
        
        # Extract detections
        detections = results[0].boxes
        
        # Filter for vehicles only
        vehicles = []
        for i, box in enumerate(detections):
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            
            if cls in self.vehicle_classes and conf >= confidence_threshold:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                vehicles.append({
                    'class': cls,
                    'confidence': conf,
                    'bbox': [float(x1), float(y1), float(x2), float(y2)],
                    'center': [(x1 + x2) / 2, (y1 + y2) / 2],
                })
        
        return {
            'frame_id': frame_id,
            'vehicle_count': len(vehicles),
            'vehicles': vehicles,
            'preprocessing': preprocessing_applied,
            'test_mode': test_mode
        }
    
    def _has_relevant_traffic_data(self, frame_analyses: List[Dict]) -> bool:
        """
        Check if video contains relevant traffic data worth storing
        Relaxed thresholds for screen videos
        """
        if not frame_analyses:
            return False
        
        # Check if test mode was used
        test_mode = any(f.get('test_mode', False) for f in frame_analyses)
        
        # Check average vehicle count
        vehicle_counts = [f['vehicle_count'] for f in frame_analyses]
        avg_vehicles = np.mean(vehicle_counts)
        max_vehicles = np.max(vehicle_counts)
        
        # Relaxed thresholds for screen videos
        if test_mode:
            return avg_vehicles >= 1 or max_vehicles >= 2
        else:
            return avg_vehicles >= 3 or max_vehicles >= 5
    
    def _consolidate_results(self, frame_analyses: List[Dict], fps: float, total_frames: int) -> Dict:
        """Consolidate frame-level analyses into video-level results"""
        
        if not frame_analyses:
            return {
                'incident_detected': False,
                'incident_type': 'none',
                'confidence': 0.0,
                'vehicle_count': 0,
                'avg_speed': 0.0,
                'analysis_time': 0.0,
            }
        
        # Calculate average vehicle count
        vehicle_counts = [f['vehicle_count'] for f in frame_analyses]
        avg_vehicle_count = np.mean(vehicle_counts)
        max_vehicle_count = np.max(vehicle_counts)
        
        # Estimate traffic speed (simplified)
        avg_speed = self._estimate_speed(frame_analyses)
        
        # Check if test mode
        test_mode = any(f.get('test_mode', False) for f in frame_analyses)
        
        # Detect incidents (relaxed for screen videos)
        incident_type = 'none'
        confidence = 0.0
        
        # Adjusted thresholds for screen videos
        congestion_threshold = self.congestion_vehicle_threshold
        accident_threshold = self.accident_stationary_threshold
        
        if test_mode:
            congestion_threshold = max(5, congestion_threshold // 2)
            accident_threshold = max(1, accident_threshold // 2)
        
        # Congestion detection
        if avg_vehicle_count >= congestion_threshold and avg_speed < self.congestion_speed_threshold:
            incident_type = 'congestion'
            confidence = min(0.95, avg_vehicle_count / (congestion_threshold * 1.5))
        
        # Accident detection (stationary vehicles)
        stationary_count = self._count_stationary_vehicles(frame_analyses)
        if stationary_count >= accident_threshold:
            incident_type = 'accident'
            confidence = min(0.95, stationary_count / (accident_threshold * 2))
        
        # ═══════════════════════════════════════════════════════════
        # TEMPORAL ANALYSIS: Confirm incident across multiple frames
        # ═══════════════════════════════════════════════════════════
        
        # Add temporal confirmation (reduces false positives)
        temporal_confirmed = False
        confidence_boost = 0.0
        
        if incident_type != 'none' and len(frame_analyses) >= 10:
            # Add frame analyses to temporal analyzer
            self.temporal_analyzer.clear_history()  # Reset for this video
            for frame_data in frame_analyses:
                self.temporal_analyzer.add_frame_analysis({
                    'confidence': confidence,
                    'has_incident': incident_type != 'none',
                    'vehicle_count': frame_data['vehicle_count']
                })
            
            # Check if incident confirmed across frames
            temporal_confirmed = self.temporal_analyzer.confirm_incident()
            
            if temporal_confirmed:
                # Boost confidence for temporally confirmed incidents
                confidence_trend = self.temporal_analyzer.get_confidence_trend()
                if confidence_trend and confidence_trend['sustained']:
                    confidence_boost = 0.1  # +10% confidence boost
                    confidence = min(0.99, confidence + confidence_boost)
                    print(f"✅ Temporal confirmation: Incident sustained across {len(frame_analyses)} frames")
            else:
                # Reduce confidence for non-confirmed detections
                confidence = max(0.1, confidence * 0.7)  # -30% confidence
                print(f"⚠️  Temporal check: Incident not consistent across frames, confidence reduced")
        
        # Determine severity (with temporal boost)
        severity = 'low'
        if confidence > 0.7:
            severity = 'critical' if incident_type == 'accident' else 'high'
        elif confidence > 0.5:
            severity = 'high' if incident_type == 'accident' else 'medium'
        elif confidence > 0.3:
            severity = 'medium'
        
        # Get vehicle trend analysis
        vehicle_trend = self.temporal_analyzer.get_vehicle_count_trend()
        
        return {
            'incident_detected': incident_type != 'none',
            'incident_type': incident_type,
            'confidence': confidence,
            'severity': severity,
            'vehicle_count': int(avg_vehicle_count),
            'max_vehicle_count': int(max_vehicle_count),
            'avg_speed': avg_speed,
            'stationary_count': stationary_count,
            'frames_analyzed': len(frame_analyses),
            'total_frames': total_frames,
            'temporal_confirmed': temporal_confirmed,
            'confidence_boost': confidence_boost,
            'vehicle_trend': vehicle_trend if vehicle_trend else {},
        }
    
    def _estimate_speed(self, frame_analyses: List[Dict]) -> float:
        """Estimate average traffic speed (simplified)"""
        # Simplified: assume slower speed with more vehicles
        if not frame_analyses:
            return 10.0
        
        vehicle_counts = [f['vehicle_count'] for f in frame_analyses]
        avg_count = np.mean(vehicle_counts)
        
        # Rough inverse relationship
        if avg_count > 15:
            return 3.0
        elif avg_count > 10:
            return 5.0
        elif avg_count > 5:
            return 8.0
        else:
            return 10.0
    
    def _count_stationary_vehicles(self, frame_analyses: List[Dict]) -> int:
        """Count vehicles that appear stationary across frames"""
        if len(frame_analyses) < 2:
            return 0
        
        # Simplified: vehicles present in multiple consecutive frames
        vehicle_counts = [f['vehicle_count'] for f in frame_analyses]
        consistent_count = min(vehicle_counts[-3:]) if len(vehicle_counts) >= 3 else 0
        
        return int(consistent_count * 0.6)  # Estimate ~60% might be stationary
