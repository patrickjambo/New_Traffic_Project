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
from session_manager import session_manager

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
    longitude: float = Form(None),
    user_id: str = Form(None),
    device_id: str = Form(None),
    clip_id: str = Form(None),
    auto_mode: str = Form(None),
    test_mode: str = Form(None),
):
    """
    Analyze traffic video for incidents.
    
    Supports two modes:
    
    1. **Session mode** (auto_mode=true OR user_id/device_id provided):
       Uses cross-clip correlation. Consecutive clips from the same source
       are linked together. Incidents are only reported after confirmation
       across multiple clips, and duplicates are suppressed via cooldown.
    
    2. **Single-clip mode** (no session info):
       Legacy behavior — each clip is analyzed independently.
    
    Form fields:
      - video: Uploaded video file
      - video_path: Path to existing file on server
      - latitude/longitude: GPS coordinates
      - user_id / device_id: Identifies the streaming source
      - clip_id: Unique clip identifier
      - auto_mode: 'true' for continuous monitoring mode
      - test_mode: 'true' for enhanced analyzer
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
        
        # Decide: session mode or single-clip mode
        use_session = (
            auto_mode == 'true' or
            user_id is not None or
            device_id is not None
        )
        
        if use_session:
            # SESSION MODE: Cross-clip correlation
            result = session_manager.process_clip(
                analyzer=analyzer,
                video_path=analysis_path,
                user_id=user_id,
                device_id=device_id,
                clip_id=clip_id,
                latitude=latitude,
                longitude=longitude,
            )
        else:
            # SINGLE-CLIP MODE: Legacy independent analysis
            result = analyzer.analyze_video(analysis_path)
        
        # Add processing time and location
        result["processing_time_seconds"] = round(time.time() - start_time, 2)
        result["location"] = {
            "latitude": latitude,
            "longitude": longitude
        }
        
        # Notify backend only if session says REPORT (or single-clip mode with incident)
        session_action = result.get('session_action')
        should_notify = False
        
        if use_session:
            # In session mode, only notify on 'report' action
            should_notify = (session_action == 'report')
        else:
            # In single-clip mode, notify if incident detected
            should_notify = (
                result.get("incident_detected") and 
                result.get("incident_type") not in ("normal", "none", "error")
            )
        
        if should_notify:
            try:
                await notify_backend(
                    incident_id=0,  # Backend will create the real ID
                    result=result,
                    confidence=result.get('confidence', 0),
                    vehicle_count=result.get('vehicles_detected', 0),
                    incident_detected=result.get('incident_detected', False),
                    detected_type=result.get('incident_type'),
                )
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
    """Get AI service status including session manager stats"""
    stats = session_manager.get_stats()
    return {
        "status": "operational",
        "analyzer": "LightweightTrafficAnalyzer",
        "engine": "OpenCV",
        "version": "3.0.0-light",
        "memory_footprint": "~50MB",
        "session_manager": stats,
        "capabilities": [
            "vehicle_detection",
            "motion_analysis",
            "congestion_detection",
            "incident_detection",
            "stopped_vehicle_detection",
            "cross_clip_correlation",
            "duplicate_suppression",
            "session_based_analysis",
        ]
    }


@app.get("/ai/sessions")
async def get_sessions():
    """Get active session details for monitoring"""
    return session_manager.get_stats()


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AI_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
