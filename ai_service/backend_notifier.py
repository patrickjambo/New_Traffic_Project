"""
Backend Notifier - Sends analysis results to backend via webhook
Enables real-time notifications when AI analysis completes
"""

import httpx
import asyncio
import os
from typing import Optional, Dict, Any

# Configuration
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:3000')
WEBHOOK_ENDPOINT = '/webhook/analysis-complete'
TIMEOUT = 10  # seconds


async def notify_backend(
    incident_id: int,
    result: Dict[str, Any],
    confidence: float = 0.0,
    vehicle_count: int = 0,
    incident_detected: bool = False,
    detected_type: Optional[str] = None
) -> bool:
    """
    Send analysis result to backend webhook for real-time notification.
    
    Args:
        incident_id: ID of the incident that was analyzed
        result: Full analysis result dictionary
        confidence: Detection confidence (0-1)
        vehicle_count: Number of vehicles detected
        incident_detected: Whether an incident was detected
        detected_type: Type of incident detected (if any)
        
    Returns:
        bool: True if notification was sent successfully
    """
    try:
        url = f"{BACKEND_URL}{WEBHOOK_ENDPOINT}"
        
        payload = {
            'incident_id': incident_id,
            'result': result,
            'confidence': confidence,
            'vehicle_count': vehicle_count,
            'incident_detected': incident_detected,
            'detected_type': detected_type,
        }
        
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(url, json=payload)
            
            if response.status_code == 200:
                print(f"✅ Backend notified successfully for incident {incident_id}")
                return True
            else:
                print(f"⚠️ Backend notification failed: {response.status_code} - {response.text}")
                return False
                
    except httpx.ConnectError:
        print(f"⚠️ Could not connect to backend at {BACKEND_URL}")
        return False
    except httpx.TimeoutException:
        print(f"⚠️ Backend notification timed out")
        return False
    except Exception as e:
        print(f"❌ Error notifying backend: {str(e)}")
        return False


def notify_backend_sync(
    incident_id: int,
    result: Dict[str, Any],
    confidence: float = 0.0,
    vehicle_count: int = 0,
    incident_detected: bool = False,
    detected_type: Optional[str] = None
) -> bool:
    """
    Synchronous wrapper for notify_backend.
    Use this when calling from non-async context.
    """
    try:
        return asyncio.get_event_loop().run_until_complete(
            notify_backend(incident_id, result, confidence, vehicle_count, incident_detected, detected_type)
        )
    except RuntimeError:
        # No event loop running, create a new one
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(
                notify_backend(incident_id, result, confidence, vehicle_count, incident_detected, detected_type)
            )
        finally:
            loop.close()


class BackendNotifier:
    """
    Class-based notifier for more complex scenarios.
    Provides connection pooling and retry logic.
    """
    
    def __init__(self, backend_url: Optional[str] = None, max_retries: int = 3):
        self.backend_url = backend_url or BACKEND_URL
        self.webhook_endpoint = WEBHOOK_ENDPOINT
        self.max_retries = max_retries
        self._client: Optional[httpx.AsyncClient] = None
    
    async def __aenter__(self):
        self._client = httpx.AsyncClient(timeout=TIMEOUT)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._client:
            await self._client.aclose()
    
    async def notify(
        self,
        incident_id: int,
        result: Dict[str, Any],
        **kwargs
    ) -> bool:
        """Send notification with retry logic."""
        url = f"{self.backend_url}{self.webhook_endpoint}"
        
        payload = {
            'incident_id': incident_id,
            'result': result,
            **kwargs
        }
        
        for attempt in range(self.max_retries):
            try:
                response = await self._client.post(url, json=payload)
                if response.status_code == 200:
                    print(f"✅ Backend notified (attempt {attempt + 1})")
                    return True
            except Exception as e:
                print(f"⚠️ Notification attempt {attempt + 1} failed: {e}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(1 * (attempt + 1))  # Exponential backoff
        
        return False
