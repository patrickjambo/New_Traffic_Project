from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List

app = FastAPI()

class IncidentRequest(BaseModel):
    video_url: str
    threshold: float

class IncidentResponse(BaseModel):
    incidents: List[dict]

@app.post("/detect_incidents", response_model=IncidentResponse)
async def detect_incidents(request: IncidentRequest):
    try:
        # Placeholder for the incident detection logic
        # This should call the inference function from inference.py
        incidents = []  # Replace with actual detection results
        return IncidentResponse(incidents=incidents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Welcome to the Incident Detection API"}