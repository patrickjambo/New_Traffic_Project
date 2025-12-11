from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import sys
from datetime import datetime

# Import the incident detector
sys.path.insert(0, os.path.dirname(__file__))
from incident_detector import IncidentDetector

app = FastAPI(
    title="TrafficGuard AI Service",
    description="Video analysis and incident detection",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize detector
MODEL_PATH = os.getenv('MODEL_PATH', 'models/best.pt')
detector = IncidentDetector(MODEL_PATH)

# Temp directory for uploads
TEMP_DIR = 'temp_videos'
os.makedirs(TEMP_DIR, exist_ok=True)

@app.get("/")
async def root():
    """API info"""
    return {
        "name": "TrafficGuard AI Service",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "model_loaded": True,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/analyze")
async def analyze_video(file: UploadFile = File(...)):
    """
    Analyze uploaded video for traffic incidents
    
    Args:
        file: Video file (mp4, avi, mov)
        
    Returns:
        JSON with detected incidents
    """
    
    # Validate file type - accept any video
    if file.content_type and not file.content_type.startswith('video/'):
        # Check file extension as fallback
        if not any(file.filename.lower().endswith(ext) for ext in ['.mp4', '.avi', '.mov', '.mkv', '.3gp', '.webm']):
            raise HTTPException(status_code=400, detail="File must be a video")
    
    # Save uploaded file
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{timestamp}_{file.filename}"
    filepath = os.path.join(TEMP_DIR, filename)
    
    try:
        # Write file to disk
        with open(filepath, 'wb') as f:
            content = await file.read()
            f.write(content)
        
        print(f"📥 Received video: {file.filename} ({len(content)/1024/1024:.2f} MB)")
        print(f"🎬 Starting analysis...")
        
        # Analyze video with lower confidence for better detection
        incidents = detector.analyze_video(filepath, confidence_threshold=0.3)
        
        print(f"✅ Analysis complete: {len(incidents)} incidents detected")
        
        # Clean up temp file
        try:
            os.remove(filepath)
        except:
            pass
        
        return JSONResponse(content={
            "success": True,
            "status": "incident_detected" if incidents else "no_incident",
            "count": len(incidents),
            "incidents": incidents,
            "filename": file.filename
        })
        
    except Exception as e:
        # Clean up on error
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except:
                pass
        
        print(f"❌ Error analyzing video: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-frame")
async def analyze_frame(file: UploadFile = File(...)):
    """
    Analyze single frame/image for incidents
    
    Args:
        file: Image file
        
    Returns:
        JSON with detected incidents
    """
    
    import cv2
    import numpy as np
    
    try:
        # Read image
        content = await file.read()
        nparr = np.frombuffer(content, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Analyze frame
        detections = detector.analyze_frame(frame)
        
        return JSONResponse(content={
            "success": True,
            "count": len(detections),
            "detections": detections
        })
        
    except Exception as e:
        print(f"❌ Error analyzing frame: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("\n🚦 TrafficGuard AI Service Starting...")
    print("="*50)
    print(f"Model: {MODEL_PATH}")
    print(f"Temp directory: {TEMP_DIR}")
    print("="*50)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv('PORT', 8000)),
        log_level="info"
    )
