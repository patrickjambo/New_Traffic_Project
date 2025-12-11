#!/usr/bin/env python3
"""
TrafficGuard AI - Incident Detection Engine
Analyzes videos for accidents, fires, and traffic jams
"""

from ultralytics import YOLO
import cv2
import numpy as np
from datetime import datetime
import json
import os

class IncidentDetector:
    """AI-powered incident detection using YOLOv8"""
    
    def __init__(self, model_path='models/best.pt'):
        """
        Initialize the incident detector
        
        Args:
            model_path: Path to trained YOLOv8 model
        """
        print("🤖 Loading AI model...")
        
        if not os.path.exists(model_path):
            print(f"⚠️  Model not found at {model_path}")
            print("   Using default YOLOv8 model (vehicle detection only)")
            print("   Train custom model using Colab notebook for incident detection!")
            model_path = 'yolov8n.pt'
        
        self.model = YOLO(model_path)
        
        # Incident types (update these based on your trained model)
        self.incident_types = {
            0: 'accident',
            1: 'fire',
            2: 'traffic_jam',
            # Add more as needed
        }
        
        # Vehicle classes from COCO dataset (for default model)
        self.vehicle_classes = {
            2: 'car',
            3: 'motorcycle',
            5: 'bus',
            7: 'truck'
        }
        
        print("✅ Model loaded successfully!")
    
    def analyze_video(self, video_path, confidence_threshold=0.6, save_annotated=False):
        """
        Analyze entire video for incidents
        
        Args:
            video_path: Path to video file
            confidence_threshold: Minimum confidence for detection (0-1)
            save_annotated: Save video with detection boxes
            
        Returns:
            List of detected incidents with timestamps
        """
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            print(f"❌ Error: Cannot open video {video_path}")
            return []
        
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        print(f"\n📹 Analyzing video: {video_path}")
        print(f"   Frames: {total_frames}, FPS: {fps:.1f}")
        
        incidents = []
        frame_count = 0
        
        # Setup annotated video writer if requested
        out = None
        if save_annotated:
            output_path = video_path.replace('.mp4', '_annotated.mp4')
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Analyze every 30 frames (~1 per second)
            if frame_count % 30 == 0:
                results = self.model(frame, verbose=False)[0]
                
                # Process detections
                for box in results.boxes:
                    cls = int(box.cls[0])
                    conf = float(box.conf[0])
                    
                    if conf >= confidence_threshold:
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        
                        incident = {
                            'type': self.incident_types.get(cls, 'vehicle'),
                            'confidence': round(conf, 3),
                            'timestamp': round(frame_count / fps, 2),
                            'frame': frame_count,
                            'bbox': {
                                'x1': int(x1), 'y1': int(y1),
                                'x2': int(x2), 'y2': int(y2)
                            }
                        }
                        incidents.append(incident)
                        print(f"  🚨 {incident['type'].upper()} detected at {incident['timestamp']}s (conf: {conf:.2f})")
                
                # Draw boxes on frame
                if save_annotated and out:
                    annotated = results.plot()
                    out.write(annotated)
            
            frame_count += 1
            
            # Progress bar
            if frame_count % 100 == 0:
                progress = (frame_count / total_frames) * 100
                print(f"   Progress: {progress:.1f}%", end='\r')
        
        cap.release()
        if out:
            out.release()
            print(f"\n💾 Annotated video saved: {output_path}")
        
        print(f"\n✅ Analysis complete: {len(incidents)} detection(s) found")
        return incidents
    
    def analyze_frame(self, frame, confidence_threshold=0.5):
        """
        Analyze single frame for real-time detection
        
        Args:
            frame: OpenCV frame (numpy array)
            confidence_threshold: Minimum confidence
            
        Returns:
            List of detections in this frame
        """
        results = self.model(frame, verbose=False)[0]
        detections = []
        
        for box in results.boxes:
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            
            if conf >= confidence_threshold:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                
                detections.append({
                    'type': self.incident_types.get(cls, 'vehicle'),
                    'confidence': round(conf, 3),
                    'bbox': {
                        'x1': int(x1), 'y1': int(y1),
                        'x2': int(x2), 'y2': int(y2)
                    }
                })
        
        return detections
    
    def get_annotated_frame(self, frame):
        """
        Get frame with detection boxes drawn
        
        Args:
            frame: OpenCV frame
            
        Returns:
            Annotated frame
        """
        results = self.model(frame, verbose=False)[0]
        return results.plot()
    
    def save_report(self, incidents, output_path='incident_report.json'):
        """Save incident report to JSON file"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_incidents': len(incidents),
            'incidents': incidents
        }
        
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"📄 Report saved to {output_path}")

# Test the detector
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python incident_detector.py <video_path>")
        print("Example: python incident_detector.py test_video.mp4")
        sys.exit(1)
    
    video_path = sys.argv[1]
    
    if not os.path.exists(video_path):
        print(f"❌ Error: Video not found: {video_path}")
        sys.exit(1)
    
    # Initialize detector
    detector = IncidentDetector('models/best.pt')
    
    # Analyze video
    incidents = detector.analyze_video(video_path, save_annotated=True)
    
    # Save report
    if incidents:
        detector.save_report(incidents)
        
        print("\n📊 Incident Summary:")
        for inc in incidents:
            print(f"  • {inc['type']} at {inc['timestamp']}s (confidence: {inc['confidence']*100:.1f}%)")
    else:
        print("\n✅ No incidents detected")
