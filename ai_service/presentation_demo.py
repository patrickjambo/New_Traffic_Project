#!/usr/bin/env python3
"""
TrafficGuard AI - Presentation Demo Script
=========================================
This script helps you demo your system during final year project presentation.

Usage:
    python presentation_demo.py --mode [webcam | ip_webcam | test_video]
    
Examples:
    # Demo with laptop webcam capturing screen
    python presentation_demo.py --mode webcam
    
    # Demo with phone IP webcam
    python presentation_demo.py --mode ip_webcam --ip 192.168.1.100:8080
    
    # Test with a pre-recorded screen capture
    python presentation_demo.py --mode test_video --video ./test_videos/accident_demo.mp4
"""

import cv2
import argparse
import time
import requests
import json
from pathlib import Path
from screen_preprocessing import preprocess_screen_capture
from enhanced_traffic_analyzer import EnhancedTrafficAnalyzer


class PresentationDemo:
    """Demo system for final year project presentation"""
    
    def __init__(self):
        print("🤖 Initializing TrafficGuard AI for presentation...")
        self.analyzer = EnhancedTrafficAnalyzer()
        self.backend_url = "http://localhost:3000"  # Your backend URL
        print("✅ System ready for presentation!\n")
    
    def run_webcam_demo(self, camera_id=0):
        """
        Demo using webcam to capture screen
        
        Args:
            camera_id: Camera device ID (0 for default)
        """
        print("=" * 60)
        print("📹 WEBCAM DEMO MODE")
        print("=" * 60)
        print("\n📋 Setup Instructions:")
        print("1. Play a traffic accident video on your screen")
        print("2. Position webcam to capture the screen")
        print("3. Press SPACE to capture and analyze")
        print("4. Press Q to quit\n")
        
        cap = cv2.VideoCapture(camera_id)
        
        if not cap.isOpened():
            print("❌ Error: Could not open webcam")
            return
        
        print("✅ Webcam connected. Starting demo...")
        print("   Press SPACE to analyze | Press Q to quit\n")
        
        frame_count = 0
        last_detection_time = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Preprocess frame for better detection
            processed = preprocess_screen_capture(frame)
            
            # Show live preview
            display_frame = processed.copy()
            cv2.putText(display_frame, "TrafficGuard AI - Live Demo", 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.putText(display_frame, "Press SPACE to analyze | Q to quit", 
                       (10, display_frame.shape[0] - 20), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
            
            cv2.imshow('TrafficGuard AI - Presentation Demo', display_frame)
            
            key = cv2.waitKey(1) & 0xFF
            
            # Press SPACE to capture and analyze
            if key == ord(' '):
                print("\n🔍 Analyzing captured frame...")
                self._analyze_and_display(processed, f"capture_{frame_count}")
                frame_count += 1
                last_detection_time = time.time()
            
            # Auto-detect every 2 seconds
            elif time.time() - last_detection_time > 2:
                results = self.analyzer._analyze_frame(processed, frame_count, test_mode=True)
                if results and results.get('vehicle_count', 0) > 0:
                    print(f"🚗 Detected {results['vehicle_count']} vehicles")
                last_detection_time = time.time()
            
            # Press Q to quit
            if key == ord('q'):
                break
        
        cap.release()
        cv2.destroyAllWindows()
        print("\n✅ Demo completed!")
    
    def run_ip_webcam_demo(self, ip_address):
        """
        Demo using phone IP webcam to capture screen
        
        Args:
            ip_address: Phone IP address (e.g., "192.168.1.100:8080")
        """
        print("=" * 60)
        print("📱 IP WEBCAM DEMO MODE")
        print("=" * 60)
        print("\n📋 Setup Instructions:")
        print("1. Install 'IP Webcam' app on your Android phone")
        print("2. Connect phone to same WiFi as laptop")
        print(f"3. Start server on phone (should show {ip_address})")
        print("4. Play traffic video on your laptop screen")
        print("5. Point phone camera at the screen\n")
        
        # Construct video stream URL
        if not ip_address.startswith('http'):
            video_url = f"http://{ip_address}/video"
        else:
            video_url = f"{ip_address}/video"
        
        print(f"🔗 Connecting to: {video_url}")
        
        cap = cv2.VideoCapture(video_url)
        
        if not cap.isOpened():
            print(f"❌ Error: Could not connect to IP webcam at {video_url}")
            print("   Make sure:")
            print("   - Phone and laptop are on same WiFi")
            print("   - IP address is correct")
            print("   - IP Webcam server is running on phone")
            return
        
        print("✅ Connected to phone camera!")
        print("   Press SPACE to analyze | Press Q to quit\n")
        
        self.run_webcam_demo(camera_id=video_url)
    
    def run_test_video_demo(self, video_path):
        """
        Demo using pre-recorded screen capture video
        
        Args:
            video_path: Path to test video file
        """
        print("=" * 60)
        print("🎬 TEST VIDEO DEMO MODE")
        print("=" * 60)
        print(f"\n📁 Analyzing: {video_path}\n")
        
        if not Path(video_path).exists():
            print(f"❌ Error: Video file not found: {video_path}")
            return
        
        # Analyze the full video
        print("🔍 Running full video analysis...")
        start_time = time.time()
        
        try:
            results = self.analyzer.analyze_video(video_path, test_mode=True)
            analysis_time = time.time() - start_time
            
            # Display results
            print("\n" + "=" * 60)
            print("📊 ANALYSIS RESULTS")
            print("=" * 60)
            print(f"\n🎥 Video Analysis Complete ({analysis_time:.2f}s)")
            print(f"\n🚨 Incident Detected: {'YES' if results['incident_detected'] else 'NO'}")
            
            if results['incident_detected']:
                print(f"   Type: {results['incident_type'].upper()}")
                print(f"   Confidence: {results['confidence']:.1%}")
                print(f"   Severity: {results['severity'].upper()}")
                print(f"   🚗 Vehicles: {results['vehicle_count']} (avg), {results['max_vehicle_count']} (max)")
                print(f"   ⏱️  Speed: {results['avg_speed']:.1f} km/h (estimated)")
                
                if results.get('temporal_confirmed'):
                    print(f"   ✅ Temporal Confirmation: Sustained across frames")
                
                # Send to backend (optional)
                print("\n📤 Sending incident report to backend...")
                self._send_to_backend(results, video_path)
            else:
                print("   ℹ️  No incidents detected in this video")
                print(f"   🚗 Vehicle count: {results['vehicle_count']}")
            
            print("\n" + "=" * 60)
            
        except Exception as e:
            print(f"\n❌ Error during analysis: {str(e)}")
    
    def _analyze_and_display(self, frame, frame_id):
        """Analyze a single frame and display results"""
        results = self.analyzer._analyze_frame(frame, frame_id, test_mode=True)
        
        if results:
            vehicle_count = results.get('vehicle_count', 0)
            print(f"\n   ✅ Analysis complete!")
            print(f"   🚗 Detected: {vehicle_count} vehicles")
            
            if vehicle_count > 5:
                print(f"   ⚠️  Possible congestion detected!")
        else:
            print(f"\n   ℹ️  No vehicles detected in this frame")
    
    def _send_to_backend(self, results, video_path):
        """Send detection results to backend"""
        try:
            # Prepare incident data matching testIncidentDetection endpoint
            incident_data = {
                "incident_detected": True,
                "type": results['incident_type'],
                "severity": results['severity'],
                "confidence": float(results['confidence']) * 100, # Backend expects 0-100
                "vehicle_count": int(results['vehicle_count']),
                "stationary_count": int(results.get('stationary_count', 0)),
                "avg_speed": float(results.get('avg_speed', 0)),
                "frames_analyzed": int(results.get('frames_analyzed', 0)),
                "location": {
                    "latitude": -1.9441,  # Kigali coordinates
                    "longitude": 30.0619,
                    "location_name": "Kigali City Center (Demo)"
                }
            }
            
            # Send to backend
            print(f"   📤 Sending to {self.backend_url}/api/incidents/test-detection...")
            response = requests.post(
                f"{self.backend_url}/api/incidents/test-detection",
                json=incident_data,
                timeout=5
            )
            
            if response.status_code == 200:
                print("   ✅ Incident report sent successfully!")
                data = response.json().get('data', {})
                if data.get('emergency_created'):
                    print(f"   🚨 AUTOMATIC EMERGENCY CREATED! ID: {data.get('emergency_id')}")
            else:
                print(f"   ⚠️  Backend returned error: {response.status_code} - {response.text}")
            
        except Exception as e:
            print(f"   ⚠️  Could not send to backend: {str(e)}")


def main():
    parser = argparse.ArgumentParser(
        description="TrafficGuard AI - Presentation Demo",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --mode webcam
  %(prog)s --mode ip_webcam --ip 192.168.1.100:8080
  %(prog)s --mode test_video --video ./demo_videos/accident.mp4
        """
    )
    
    parser.add_argument(
        '--mode',
        choices=['webcam', 'ip_webcam', 'test_video'],
        required=True,
        help='Demo mode to run'
    )
    
    parser.add_argument(
        '--ip',
        type=str,
        help='IP address for IP webcam mode (e.g., 192.168.1.100:8080)'
    )
    
    parser.add_argument(
        '--video',
        type=str,
        help='Path to test video for test_video mode'
    )
    
    parser.add_argument(
        '--camera',
        type=int,
        default=0,
        help='Camera ID for webcam mode (default: 0)'
    )
    
    args = parser.parse_args()
    
    # Create demo instance
    demo = PresentationDemo()
    
    # Run appropriate demo mode
    if args.mode == 'webcam':
        demo.run_webcam_demo(camera_id=args.camera)
    
    elif args.mode == 'ip_webcam':
        if not args.ip:
            print("❌ Error: --ip is required for ip_webcam mode")
            print("   Example: --ip 192.168.1.100:8080")
            return
        demo.run_ip_webcam_demo(args.ip)
    
    elif args.mode == 'test_video':
        if not args.video:
            print("❌ Error: --video is required for test_video mode")
            print("   Example: --video ./demo_videos/accident.mp4")
            return
        demo.run_test_video_demo(args.video)


if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║          🚦 TrafficGuard AI - Presentation Demo 🚦          ║
║                                                              ║
║              AI-Powered Traffic Incident Detection           ║
║                    Final Year Project                        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    main()
