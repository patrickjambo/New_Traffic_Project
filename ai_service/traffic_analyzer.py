import cv2
import numpy as np
from ultralytics import YOLO
from typing import List, Dict, Tuple
import os
from dotenv import load_dotenv

load_dotenv()

class TrafficAnalyzer:
    """Traffic analysis using YOLOv8 for incident detection"""
    
    def __init__(self):
        model_path = os.getenv('MODEL_PATH', './models/yolov8n.pt')
        self.model = YOLO(model_path)
        
        # Detection parameters
        self.frame_skip = int(os.getenv('FRAME_SKIP', 5))
        self.input_size = int(os.getenv('INPUT_RESOLUTION', 640))
        self.min_confidence = float(os.getenv('MIN_CONFIDENCE', 0.5))
        
        # Incident thresholds
        self.congestion_vehicle_threshold = int(os.getenv('CONGESTION_VEHICLE_THRESHOLD', 12))
        self.congestion_speed_threshold = float(os.getenv('CONGESTION_SPEED_THRESHOLD', 8))
        self.accident_stationary_threshold = int(os.getenv('ACCIDENT_STATIONARY_THRESHOLD', 2))
        
        # Vehicle classes in COCO dataset
        self.vehicle_classes = [2, 3, 5, 7]  # car, motorcycle, bus, truck
    
    def analyze_video(self, video_path: str) -> Dict:
        """
        Analyze traffic video for incidents
        
        Args:
            video_path: Path to video file
            
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
                    analysis = self._analyze_frame(frame, frame_count)
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
        return result
    
    def analyze_short_clip(self, video_path: str) -> Dict:
        """
        Quick analysis optimized for 5-second clips from auto-capture
        
        Args:
            video_path: Path to short video file
            
        Returns:
            dict with quick analysis results including has_relevant_data flag
        """
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise ValueError(f"Could not open video file: {video_path}")
        
        frame_count = 0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        frame_analyses = []
        
        # Process every 2nd frame for faster analysis
        frame_skip = 2
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            if frame_count % frame_skip == 0:
                analysis = self._analyze_frame(frame, frame_count)
                if analysis:
                    frame_analyses.append(analysis)
            
            frame_count += 1
        
        cap.release()
        
        # Quick relevance check
        has_relevant_data = self._has_relevant_traffic_data(frame_analyses)
        
        if not has_relevant_data:
            return {
                'incident_detected': False,
                'has_relevant_data': False,
                'incident_type': 'none',
                'confidence': 0.0,
                'vehicle_count': 0,
            }
        
        # Full analysis if relevant data found
        result = self._consolidate_results(frame_analyses, fps, total_frames)
        result['has_relevant_data'] = True
        
        return result
    
    def _has_relevant_traffic_data(self, frame_analyses: List[Dict]) -> bool:
        """
        Check if video contains relevant traffic data worth storing
        
        Args:
            frame_analyses: List of frame analysis results
            
        Returns:
            True if video has traffic activity, False otherwise
        """
        if not frame_analyses:
            return False
        
        # Check average vehicle count
        vehicle_counts = [f['vehicle_count'] for f in frame_analyses]
        avg_vehicles = np.mean(vehicle_counts)
        max_vehicles = np.max(vehicle_counts)
        
        # Consider relevant if:
        # - Average vehicles >= 3 (some traffic activity)
        # - OR max vehicles >= 5 (peak traffic moment)
        return avg_vehicles >= 3 or max_vehicles >= 5
    
    def _analyze_frame(self, frame: np.ndarray, frame_id: int) -> Dict:
        """Analyze a single frame"""
        # Run YOLOv8 detection
        results = self.model(frame, imgsz=self.input_size, verbose=False)
        
        if not results or len(results) == 0:
            return None
        
        # Extract detections
        detections = results[0].boxes
        
        # Filter for vehicles only
        vehicles = []
        for i, box in enumerate(detections):
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            
            if cls in self.vehicle_classes and conf >= self.min_confidence:
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
        }
    
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
        
        # Detect incidents
        incident_type = 'none'
        confidence = 0.0
        
        # Congestion detection
        if avg_vehicle_count >= self.congestion_vehicle_threshold and avg_speed < self.congestion_speed_threshold:
            incident_type = 'congestion'
            confidence = min(0.95, avg_vehicle_count / (self.congestion_vehicle_threshold * 1.5))
        
        # Accident detection (stationary vehicles)
        stationary_count = self._count_stationary_vehicles(frame_analyses)
        if stationary_count >= self.accident_stationary_threshold:
            incident_type = 'accident'
            confidence = min(0.85, stationary_count / 4)
        
        # Road blockage (very high density, very low speed)
        if avg_vehicle_count > 20 and avg_speed < 2:
            incident_type = 'road_blockage'
            confidence = 0.9
        
        return {
            'incident_detected': incident_type != 'none',
            'incident_type': incident_type,
            'confidence': float(confidence),
            'vehicle_count': int(avg_vehicle_count),
            'max_vehicle_count': int(max_vehicle_count),
            'avg_speed': float(avg_speed),
            'stationary_count': int(stationary_count),
            'frames_analyzed': len(frame_analyses),
            'total_frames': total_frames,
        }
    
    def _estimate_speed(self, frame_analyses: List[Dict]) -> float:
        """
        Estimate average traffic speed (simplified)
        Based on vehicle movement between frames
        """
        if len(frame_analyses) < 2:
            return 10.0  # Default speed
        
        movements = []
        
        for i in range(len(frame_analyses) - 1):
            current_frame = frame_analyses[i]
            next_frame = frame_analyses[i + 1]
            
            if current_frame['vehicle_count'] > 0 and next_frame['vehicle_count'] > 0:
                # Simple movement estimation
                # In real implementation, would use object tracking
                movement = self._calculate_movement(
                    current_frame['vehicles'],
                    next_frame['vehicles']
                )
                if movement > 0:
                    movements.append(movement)
        
        if not movements:
            return 10.0  # Default moderate speed
        
        avg_movement = np.mean(movements)
        
        # Convert pixel movement to speed estimate (very simplified)
        # Assume 1 pixel = ~0.1 km/h (calibration needed in production)
        estimated_speed = avg_movement * 0.1 * self.frame_skip
        
        return min(60.0, max(0.0, estimated_speed))  # Cap at realistic range
    
    def _calculate_movement(self, vehicles1: List[Dict], vehicles2: List[Dict]) -> float:
        """Calculate average movement between two frames"""
        if not vehicles1 or not vehicles2:
            return 0.0
        
        # Simple centroid movement
        centers1 = [v['center'] for v in vehicles1]
        centers2 = [v['center'] for v in vehicles2]
        
        centroid1 = np.mean(centers1, axis=0)
        centroid2 = np.mean(centers2, axis=0)
        
        movement = np.linalg.norm(centroid1 - centroid2)
        return movement
    
    def _count_stationary_vehicles(self, frame_analyses: List[Dict]) -> int:
        """Count vehicles that appear stationary across frames"""
        if len(frame_analyses) < 3:
            return 0
        
        # Simplified: vehicles in same position across multiple frames
        # In production, would use proper object tracking
        
        # Check if vehicle count is consistent and movement is low
        vehicle_counts = [f['vehicle_count'] for f in frame_analyses]
        avg_count = np.mean(vehicle_counts)
        std_count = np.std(vehicle_counts)
        
        # Low variation suggests stationary vehicles
        if std_count < 2 and avg_count >= 2:
            return int(avg_count * 0.3)  # Estimate 30% might be stationary
        
        return 0
