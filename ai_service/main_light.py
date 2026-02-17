"""
TrafficGuard AI Service - Lightweight Version
Uses OpenCV only (~50MB) instead of PyTorch/YOLO (~900MB)
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import os
import time
import shutil
from pathlib import Path
from dotenv import load_dotenv
from contextlib import asynccontextmanager

# Import lightweight analyzer (no PyTorch needed)
from lightweight_analyzer import analyzer
from backend_notifier import notify_backend

load_dotenv()

# Temp directory for uploads
TEMP_DIR = Path("./temp_uploads")
TEMP_DIR.mkdir(exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown"""
    print("""
🤖 TrafficGuard AI Service (Lightweight)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ AI Service initialized
🧠 Engine: OpenCV-based detection
📊 Ready for traffic analysis
💾 Low memory footprint (~50MB)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    """)
    yield
    # Cleanup on shutdown
    if TEMP_DIR.exists():
        shutil.rmtree(TEMP_DIR, ignore_errors=True)


app = FastAPI(
    title="TrafficGuard AI Service",
    description="Lightweight traffic analysis using OpenCV",
    version="3.0.0-light",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "service": "TrafficGuard AI",
        "version": "3.0.0-light",
        "status": "running",
        "engine": "OpenCV"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "TrafficGuard AI",
        "version": "3.0.0-light",
        "engine": "OpenCV-based detection"
    }


@app.post("/ai/analyze-traffic")
async def analyze_traffic(
    video: UploadFile = File(None),
    video_path: str = Form(None),
    latitude: float = Form(None),
    longitude: float = Form(None)
):
    """
    Analyze traffic video for incidents
    Accepts either uploaded file or path to existing file
    """
    start_time = time.time()
    temp_path = None
    
    try:
        # Determine video path
        if video:
            # Save uploaded file
            temp_path = TEMP_DIR / f"upload_{int(time.time())}_{video.filename}"
            with open(temp_path, "wb") as f:
                content = await video.read()
                f.write(content)
            analysis_path = str(temp_path)
        elif video_path:
            analysis_path = video_path
        else:
            raise HTTPException(status_code=400, detail="No video provided")
        
        # Check file exists
        if not os.path.exists(analysis_path):
            raise HTTPException(status_code=404, detail="Video file not found")
        
        # Analyze video
        result = analyzer.analyze_video(analysis_path)
        
        # Add processing time
        result["processing_time_seconds"] = round(time.time() - start_time, 2)
        result["location"] = {
            "latitude": latitude,
            "longitude": longitude
        }
        
        # Notify backend if incident detected
        if result.get("incident_detected") and result.get("incident_type") != "normal":
            try:
                notify_backend(result, latitude, longitude)
            except Exception as e:
                print(f"Backend notification failed: {e}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temp file
        if temp_path and temp_path.exists():
            try:
                temp_path.unlink()
            except:
                pass


@app.post("/ai/analyze-image")
async def analyze_image(
    image: UploadFile = File(...),
    latitude: float = Form(None),
    longitude: float = Form(None)
):
    """Analyze a single image for traffic conditions"""
    start_time = time.time()
    temp_path = None
    
    try:
        # Save uploaded image
        temp_path = TEMP_DIR / f"img_{int(time.time())}_{image.filename}"
        with open(temp_path, "wb") as f:
            content = await image.read()
            f.write(content)
        
        # Analyze image
        result = analyzer.analyze_image(str(temp_path))
        result["processing_time_seconds"] = round(time.time() - start_time, 2)
        result["location"] = {
            "latitude": latitude,
            "longitude": longitude
        }
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path and temp_path.exists():
            try:
                temp_path.unlink()
            except:
                pass


@app.get("/ai/status")
async def get_status():
    """Get AI service status"""
    return {
        "status": "operational",
        "analyzer": "LightweightTrafficAnalyzer",
        "engine": "OpenCV",
        "version": "3.0.0-light",
        "memory_footprint": "~50MB",
        "capabilities": [
            "vehicle_detection",
            "motion_analysis",
            "congestion_detection",
            "incident_detection",
            "stopped_vehicle_detection"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AI_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
