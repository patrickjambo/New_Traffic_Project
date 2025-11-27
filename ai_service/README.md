# TrafficGuard AI Service

Python-based AI service for traffic video analysis using YOLOv8.

## Features

- Video-based traffic incident detection
- YOLOv8 nano model for efficient processing
- Detects: Congestion, Accidents, Road Blockages
- Frame skipping for performance
- RESTful API with FastAPI

## Setup

### 1. Create Virtual Environment

```bash
cd ai_service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configuration

```bash
cp .env.example .env
# Edit .env if needed
```

### 4. Run Service

```bash
python main.py
```

Or with uvicorn:

```bash
uvicorn main:app --reload --port 8000
```

## API Endpoints

### Analyze Traffic Video

**POST** `/ai/analyze-traffic`

Upload a video file for traffic analysis.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `video` (file upload)

**Response:**
```json
{
  "success": true,
  "data": {
    "incident_detected": true,
    "incident_type": "congestion",
    "confidence": 0.85,
    "vehicle_count": 15,
    "avg_speed": 5.2,
    "stationary_count": 3,
    "analysis_time": 12.5
  }
}
```

### Health Check

**GET** `/health`

Check service health status.

## How It Works

1. **Video Upload**: Client uploads video file
2. **Frame Extraction**: Extract frames with skipping (every 5th frame)
3. **Object Detection**: Run YOLOv8 on each frame
4. **Vehicle Detection**: Filter for vehicle classes
5. **Incident Analysis**: Analyze patterns for incidents:
   - **Congestion**: >12 vehicles + speed <8 km/h
   - **Accident**: ≥2 stationary vehicles
   - **Road Blockage**: >20 vehicles + speed <2 km/h
6. **Results**: Return consolidated analysis

## Performance Optimization

- YOLOv8n (nano) model - lightweight & fast
- Frame skipping (process every 5th frame)
- Reduced input resolution (640px)
- Single frame processing (low memory)
- Max 30-second videos

## Development

### Testing

```bash
# Test with sample video
curl -X POST "http://localhost:8000/ai/analyze-traffic" \
  -F "video=@test_video.mp4"
```

### Model Configuration

Edit `.env` to adjust detection parameters:
- `CONGESTION_VEHICLE_THRESHOLD`: Minimum vehicles for congestion
- `CONGESTION_SPEED_THRESHOLD`: Maximum speed for congestion (km/h)
- `ACCIDENT_STATIONARY_THRESHOLD`: Minimum stationary vehicles for accident
- `FRAME_SKIP`: Process every Nth frame
- `MIN_CONFIDENCE`: Minimum detection confidence

## Production Deployment

For production:

1. Use proper object tracking (SORT, DeepSORT)
2. Implement video compression before analysis
3. Add result caching
4. Scale horizontally with multiple workers
5. Use GPU for faster processing
