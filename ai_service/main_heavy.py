from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import os
import time
import shutil
from pathlib import Path
from dotenv import load_dotenv

# Import local modules
from traffic_analyzer import TrafficAnalyzer
from enhanced_traffic_analyzer import EnhancedTrafficAnalyzer
from backend_notifier import notify_backend

load_dotenv()

# Initialize FastAPI app
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events
    """
    # Startup
    print("""
🤖 TrafficGuard AI Service
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ AI Service initialized
🧠 Model: YOLOv8n (nano)
📊 Ready for traffic analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    """)
    
    # Download YOLOv8n model if not exists
    models_dir = Path("./models")
    models_dir.mkdir(exist_ok=True)
    
    model_path = models_dir / "yolov8n.pt"
    if not model_path.exists():
        print("📥 Downloading YOLOv8n model... (this may take a moment)")
        # Model will auto-download on first use by Ultralytics
        from ultralytics import YOLO
        YOLO('yolov8n.pt')  # Auto-downloads
        print("✅ Model downloaded successfully")
        
    yield
    
    # Shutdown
    # Clean up temp directory
    if TEMP_DIR.exists():
        shutil.rmtree(TEMP_DIR)
    print("👋 AI Service shutting down...")

# Initialize FastAPI app
app = FastAPI(
    title="TrafficGuard AI Service",
    description="AI-powered traffic analysis for incident detection",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize traffic analyzers
analyzer = TrafficAnalyzer()
enhanced_analyzer = EnhancedTrafficAnalyzer()  # For screen video detection

# Create temp directory for uploads
TEMP_DIR = Path("./temp_videos")
TEMP_DIR.mkdir(exist_ok=True)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "TrafficGuard AI Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "analyze": "/ai/analyze-traffic",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "model_loaded": analyzer.model is not None
    }

@app.post("/ai/analyze-traffic")
async def analyze_traffic(
    video: UploadFile = File(...),
    test_mode: bool = Form(False)
):
    """
    Analyze traffic video for incident detection
    
    Args:
        video: Video file (mp4, mov, avi, mkv, webm)
        test_mode: Enable screen video detection (for YouTube recordings)
        
    Returns:
        dict with analysis results
    """
    
    # Validate file type
    allowed_extensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm']
    file_ext = Path(video.filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Save uploaded file temporarily
    temp_path = TEMP_DIR / f"temp_{int(time.time())}_{video.filename}"
    
    try:
        # Save file
        with temp_path.open("wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
        
        # Choose analyzer based on test_mode
        if test_mode:
            print(f"🧪 Test mode: Using enhanced analyzer for screen video")
            start_time = time.time()
            result = enhanced_analyzer.analyze_video(str(temp_path), test_mode=True)
            analysis_time = time.time() - start_time
        else:
            start_time = time.time()
            result = analyzer.analyze_video(str(temp_path))
            analysis_time = time.time() - start_time
        
        # Add analysis metadata
        result['analysis_time'] = round(analysis_time, 2)
        result['video_filename'] = video.filename
        result['video_size_mb'] = round(temp_path.stat().st_size / (1024 * 1024), 2)
        
        # Notify backend for real-time dashboard updates
        incident_id = getattr(video, 'incident_id', None) or int(time.time())  # Use timestamp as fallback ID
        await notify_backend(
            incident_id=incident_id,
            result=result,
            confidence=result.get('confidence', 0),
            vehicle_count=result.get('vehicle_count', 0),
            incident_detected=result.get('incident_detected', False),
            detected_type=result.get('incident_type', None)
        )
        
        return {
            "success": True,
            "data": result
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )
    
    finally:
        # Clean up temp file
        if temp_path.exists():
            temp_path.unlink()

@app.post("/ai/quick-analyze")
async def quick_analyze(video: UploadFile = File(...)):
    """
    Quick analysis for auto-captured short clips (5-second videos)
    Optimized for faster processing and relevance detection
    
    Args:
        video: Short video file (mp4, mov, avi, mkv, webm)
        
    Returns:
        dict with quick analysis results including has_relevant_data flag
    """
    
    # Validate file type
    allowed_extensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm']
    file_ext = Path(video.filename).suffix.lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Save uploaded file temporarily
    temp_path = TEMP_DIR / f"quick_{int(time.time())}_{video.filename}"
    
    try:
        # Save file
        with temp_path.open("wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
        
        # Quick analysis optimized for short clips
        start_time = time.time()
        result = analyzer.analyze_short_clip(str(temp_path))
        analysis_time = time.time() - start_time
        
        # Add analysis metadata
        result['analysis_time'] = round(analysis_time, 2)
        result['video_size_mb'] = round(temp_path.stat().st_size / (1024 * 1024), 2)
        
        return {
            "success": True,
            "data": result
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Quick analysis failed: {str(e)}"
        )
    
    finally:
        # Clean up temp file
        if temp_path.exists():
            temp_path.unlink()

if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    
    uvicorn.run(app, host=host, port=port, log_level="info")
