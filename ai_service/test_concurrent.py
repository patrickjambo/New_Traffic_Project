#!/usr/bin/env python3
"""
Concurrency stress test — simulates 5 cameras uploading simultaneously.

Picks 5 real videos (fire, traffic_jam, accident mix) and sends them
all at once via the /ai/analyze-traffic endpoint.  Verifies:
  1. All 5 complete without errors
  2. Each returns the CORRECT incident type
  3. They actually run in parallel (wall-clock < sum of individual times)
"""

import asyncio
import aiohttp
import time
import sys
import os

AI_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8000")
BASE = "/home/jambo/New_Traffic_Project/backend/uploads"

# 5 cameras with known ground-truth labels
CAMERAS = [
    # (label,   expected_type,  video_filename)
    ("Camera-1 🔥 Fire",       "fire",        "incident-1772993275863-735123806.mp4"),
    ("Camera-2 🚗 TrafficJam", "traffic_jam",  "incident-1772994645627-950916050.mp4"),
    ("Camera-3 💥 Accident",   "accident",     "incident-1772996060893-880742266.mp4"),
    ("Camera-4 🔥 Fire",       "fire",        "incident-1772994831523-42742775.mp4"),
    ("Camera-5 💥 Accident",   "accident",     "incident-1772996331313-102975020.mp4"),
]


async def analyze_one(session: aiohttp.ClientSession, cam_label: str,
                       expected: str, video_path: str) -> dict:
    """Send a single video and return result."""
    t0 = time.time()
    
    with open(video_path, "rb") as f:
        data = aiohttp.FormData()
        data.add_field("video", f, filename=os.path.basename(video_path),
                       content_type="video/mp4")
        # Use unique user_id per camera so sessions don't collide
        data.add_field("user_id", cam_label)
        data.add_field("auto_mode", "false")  # single-clip mode for test
        
        async with session.post(f"{AI_URL}/ai/analyze-traffic", data=data,
                                timeout=aiohttp.ClientTimeout(total=180)) as resp:
            result = await resp.json()
    
    elapsed = time.time() - t0
    detected = result.get("incident_type", "unknown")
    ok = detected == expected
    
    return {
        "camera": cam_label,
        "expected": expected,
        "detected": detected,
        "ok": ok,
        "elapsed": round(elapsed, 2),
        "confidence": result.get("confidence", 0),
    }


async def main():
    print(f"\n🎥 Concurrent Multi-Camera Stress Test")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"Sending {len(CAMERAS)} videos SIMULTANEOUSLY to {AI_URL}\n")
    
    wall_start = time.time()
    
    async with aiohttp.ClientSession() as session:
        tasks = []
        for cam_label, expected, fname in CAMERAS:
            path = os.path.join(BASE, fname)
            if not os.path.exists(path):
                print(f"❌ File not found: {path}")
                sys.exit(1)
            tasks.append(analyze_one(session, cam_label, expected, path))
        
        results = await asyncio.gather(*tasks)
    
    wall_time = time.time() - wall_start
    
    # Print results
    print(f"{'Camera':<25} {'Expected':<14} {'Detected':<14} {'Time':>6}  {'Status'}")
    print(f"{'─' * 25} {'─' * 14} {'─' * 14} {'─' * 6}  {'─' * 6}")
    
    total_cpu = 0
    all_ok = True
    for r in results:
        status = "✅" if r["ok"] else "❌"
        if not r["ok"]:
            all_ok = False
        total_cpu += r["elapsed"]
        print(f"{r['camera']:<25} {r['expected']:<14} {r['detected']:<14} "
              f"{r['elapsed']:>5.1f}s  {status}")
    
    print(f"\n⏱️  Wall-clock time:  {wall_time:.1f}s")
    print(f"⏱️  Sum of individual: {total_cpu:.1f}s")
    speedup = total_cpu / wall_time if wall_time > 0 else 0
    print(f"⚡ Parallelism:       {speedup:.1f}x speedup")
    
    if wall_time < total_cpu * 0.8:
        print(f"✅ Videos ran in PARALLEL (wall < 80% of sequential)")
    else:
        print(f"⚠️  Limited parallelism (wall ≈ sequential)")
    
    if all_ok:
        print(f"\n🏆 ALL {len(CAMERAS)} CAMERAS CORRECT — multi-camera works! 🎉")
    else:
        print(f"\n❌ SOME CAMERAS FAILED — check results above")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
