#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TrafficGuard AI - FULL REGRESSION TEST SUITE
Run before ANY deploy or code change. Exit 0=pass, 1=fail.
Coverage: 59 real videos + 12 synthetic + 5 concurrent.
Created 2026-03-09. DO NOT modify detection thresholds without re-running.
"""
import sys, os, time, argparse

BASE_DIR = "/home/jambo/New_Traffic_Project/backend/uploads"

FIRE_VIDEOS = [
    ("incident-1772993275863-735123806.mp4", "fire"),
    ("incident-1772993337866-362981842.mp4", "fire"),
    ("incident-1772993343405-398290458.mp4", "fire"),
    ("incident-1772993349069-383593602.mp4", "fire"),
    ("incident-1772993355493-703412497.mp4", "fire"),
    ("incident-1772993361460-215359077.mp4", "fire"),
    ("incident-1772993367540-476117609.mp4", "fire"),
    ("incident-1772993373396-408717173.mp4", "fire"),
    ("incident-1772993379792-170819787.mp4", "fire"),
    ("incident-1772993383280-926709137.mp4", "fire"),
    ("incident-1772994567395-906582377.mp4", "fire"),
    ("incident-1772994573173-865603309.mp4", "fire"),
    ("incident-1772994579016-823515523.mp4", "fire"),
    ("incident-1772994823286-230865122.mp4", "fire"),
    ("incident-1772994831523-42742775.mp4", "fire"),
    ("incident-1772994835745-723917429.mp4", "fire"),
    ("incident-1772994843447-373174181.mp4", "fire"),
    ("incident-1772994848067-344730943.mp4", "fire"),
    ("incident-1772994853761-286210216.mp4", "fire"),
]

TRAFFIC_JAM_VIDEOS = [
    ("incident-1772992933883-209539806.mp4", "traffic_jam"),
    ("incident-1772992950626-510600979.mp4", "traffic_jam"),
    ("incident-1772994645627-950916050.mp4", "traffic_jam"),
    ("incident-1772994651459-246612444.mp4", "traffic_jam"),
    ("incident-1772994657169-109159689.mp4", "traffic_jam"),
    ("incident-1772994663402-134390834.mp4", "traffic_jam"),
    ("incident-1772994669509-413170256.mp4", "traffic_jam"),
    ("incident-1772994675455-314842952.mp4", "traffic_jam"),
    ("incident-1772994885721-94610695.mp4", "traffic_jam"),
    ("incident-1772994891486-403105165.mp4", "traffic_jam"),
    ("incident-1772994897417-39806063.mp4", "traffic_jam"),
    ("incident-1772994903256-948864177.mp4", "traffic_jam"),
    ("incident-1772994909699-702596580.mp4", "traffic_jam"),
]

ACCIDENT_VIDEOS = [
    ("incident-1772992938649-723913631.mp4", "accident"),
    ("incident-1772992946216-308687063.mp4", "accident"),
    ("incident-1772994916020-803278154.mp4", "accident"),
    ("incident-1772996060893-880742266.mp4", "accident"),
    ("incident-1772996065462-664131108.mp4", "accident"),
    ("incident-1772996071453-936754661.mp4", "accident"),
    ("incident-1772996075318-899823146.mp4", "accident"),
    ("incident-1772996083868-743054475.mp4", "accident"),
    ("incident-1772996088453-686568137.mp4", "accident"),
    ("incident-1772996095350-123842127.mp4", "accident"),
    ("incident-1772996100465-575407879.mp4", "accident"),
    ("incident-1772996107299-828192037.mp4", "accident"),
    ("incident-1772996113450-911860189.mp4", "accident"),
    ("incident-1772996119656-241041899.mp4", "accident"),
    ("incident-1772996123466-776004800.mp4", "accident"),
    ("incident-1772996129306-357344583.mp4", "accident"),
    ("incident-1772996137350-204510291.mp4", "accident"),
    ("incident-1772996143353-923255743.mp4", "accident"),
    ("incident-1772996149905-799644957.mp4", "accident"),
    ("incident-1772996155324-93955186.mp4", "accident"),
    ("incident-1772996161339-3738025.mp4", "accident"),
    ("incident-1772996167229-737301784.mp4", "accident"),
    ("incident-1772996171307-811844522.mp4", "accident"),
    ("incident-1772996178947-619792811.mp4", "accident"),
    ("incident-1772996290662-226684740.mp4", "accident"),
    ("incident-1772996297922-201742481.mp4", "accident"),
    ("incident-1772996331313-102975020.mp4", "accident"),
]


def run_real_video_tests(videos, label):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from lightweight_analyzer import LightweightTrafficAnalyzer
    passed = failed = skipped = 0
    details = []
    for fname, expected in videos:
        path = os.path.join(BASE_DIR, fname)
        if not os.path.exists(path):
            skipped += 1
            details.append(("SKIP", fname, expected, "missing", ""))
            continue
        analyzer = LightweightTrafficAnalyzer()
        result = analyzer.analyze_video(path)
        detected = result.get("incident_type", "unknown")
        conf = result.get("confidence", 0)
        if detected == expected:
            passed += 1
            details.append(("PASS", fname, expected, detected, f"{conf:.2f}"))
        else:
            failed += 1
            details.append(("FAIL", fname, expected, detected, f"{conf:.2f}"))
    return passed, failed, skipped, details


def run_synthetic_tests():
    """Delegate to the proven test_detection.py which has 12 carefully crafted tests."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import importlib
    import io
    from contextlib import redirect_stdout

    # Import and run the original test suite
    spec = importlib.util.spec_from_file_location(
        "test_detection",
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_detection.py")
    )
    mod = importlib.util.module_from_spec(spec)

    # Capture stdout to parse results
    buf = io.StringIO()
    with redirect_stdout(buf):
        spec.loader.exec_module(mod)
        success = mod.run_tests()

    output = buf.getvalue()

    # Count passes and failures from output
    pass_count = output.count("PASS |")
    fail_count = output.count("FAIL |")
    total = pass_count + fail_count

    details = []
    if success:
        details.append(("PASS", f"test_detection.py: {pass_count}/{total}", "", "all passed", ""))
    else:
        details.append(("FAIL", f"test_detection.py: {pass_count}/{total}", "", f"{fail_count} failed", ""))

    return pass_count, fail_count, details
    return passed, failed, details


def run_concurrent_test():
    try:
        import asyncio, aiohttp
    except ImportError:
        return 0, 0, [("SKIP", "aiohttp not installed", "", "", "")]
    AI_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8000")
    CAMERAS = [
        ("Cam1-Fire",     "fire",        "incident-1772993275863-735123806.mp4"),
        ("Cam2-TJ",       "traffic_jam", "incident-1772994645627-950916050.mp4"),
        ("Cam3-Accident", "accident",    "incident-1772996060893-880742266.mp4"),
        ("Cam4-Fire",     "fire",        "incident-1772994831523-42742775.mp4"),
        ("Cam5-Accident", "accident",    "incident-1772996331313-102975020.mp4"),
    ]
    for _, _, fname in CAMERAS:
        if not os.path.exists(os.path.join(BASE_DIR, fname)):
            return 0, 0, [("SKIP", f"Missing: {fname}", "", "", "")]
    import urllib.request
    try:
        urllib.request.urlopen(f"{AI_URL}/health", timeout=3)
    except Exception:
        return 0, 0, [("SKIP", "AI service not running", "", "", "")]

    async def send_one(session, label, expected, fname):
        path = os.path.join(BASE_DIR, fname)
        with open(path, "rb") as f:
            data = aiohttp.FormData()
            data.add_field("video", f, filename=fname, content_type="video/mp4")
            data.add_field("user_id", label)
            data.add_field("auto_mode", "false")
            async with session.post(f"{AI_URL}/ai/analyze-traffic", data=data,
                                    timeout=aiohttp.ClientTimeout(total=180)) as resp:
                result = await resp.json()
        return label, expected, result.get("incident_type", "unknown"), result.get("confidence", 0)

    async def run_all():
        async with aiohttp.ClientSession() as session:
            return await asyncio.gather(*[send_one(session, l, e, fn) for l, e, fn in CAMERAS])

    results = asyncio.run(run_all())
    passed = failed = 0
    details = []
    for label, expected, detected, conf in results:
        if detected == expected:
            passed += 1
            details.append(("PASS", label, expected, detected, f"{conf:.2f}"))
        else:
            failed += 1
            details.append(("FAIL", label, expected, detected, f"{conf:.2f}"))
    return passed, failed, details


def print_section(title, passed, failed, skipped, details):
    total = passed + failed
    icon = "PASS" if failed == 0 else "FAIL"
    print(f"\n{'=' * 62}")
    print(f"  [{icon}] {title}: {passed}/{total}", end="")
    if skipped: print(f" ({skipped} skipped)", end="")
    print()
    print(f"{'=' * 62}")
    for status, name, expected, detected, conf in details:
        short = name[:42]
        if status == "PASS":
            print(f"  PASS  {short:<42s} -> {detected:<14s} {conf}")
        elif status == "FAIL":
            print(f"  FAIL  {short:<42s} -> {detected:<14s} (exp {expected}) {conf}")
        elif status == "SKIP":
            print(f"  SKIP  {short:<42s} {expected}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--real", action="store_true")
    parser.add_argument("--synthetic", action="store_true")
    parser.add_argument("--concurrent", action="store_true")
    parser.add_argument("--quick", action="store_true")
    args = parser.parse_args()
    run_all_flag = not (args.real or args.synthetic or args.concurrent or args.quick)

    print("\n" + "=" * 62)
    print("  TrafficGuard AI - FULL REGRESSION TEST SUITE")
    print("  59 real + 12 synthetic + 5 concurrent | Locked 2026-03-09")
    print("=" * 62)

    gp = gf = gs = 0
    t0 = time.time()

    if run_all_flag or args.real or args.quick:
        if args.quick:
            quick = [FIRE_VIDEOS[0], TRAFFIC_JAM_VIDEOS[0], ACCIDENT_VIDEOS[0]]
            p, f, s, d = run_real_video_tests(quick, "Quick")
            print_section("Quick Sanity (1 fire + 1 TJ + 1 ACC)", p, f, s, d)
        else:
            p1,f1,s1,d1 = run_real_video_tests(FIRE_VIDEOS, "Fire")
            print_section("FIRE Videos (19)", p1, f1, s1, d1)
            p2,f2,s2,d2 = run_real_video_tests(TRAFFIC_JAM_VIDEOS, "TJ")
            print_section("TRAFFIC JAM Videos (13)", p2, f2, s2, d2)
            p3,f3,s3,d3 = run_real_video_tests(ACCIDENT_VIDEOS, "ACC")
            print_section("ACCIDENT Videos (27)", p3, f3, s3, d3)
            p, f, s = p1+p2+p3, f1+f2+f3, s1+s2+s3
        gp += p; gf += f; gs += s

    if run_all_flag or args.synthetic:
        p, f, d = run_synthetic_tests()
        print_section("Synthetic Tests (12)", p, f, 0, d)
        gp += p; gf += f

    if run_all_flag or args.concurrent:
        p, f, d = run_concurrent_test()
        is_skip = any(s == "SKIP" for s, *_ in d)
        print_section("Concurrent Multi-Camera (5)", p, f, 0, d)
        if not is_skip:
            gp += p; gf += f

    elapsed = time.time() - t0
    total = gp + gf
    print(f"\n{'=' * 62}")
    if gf == 0:
        print(f"  ALL {total} TESTS PASSED in {elapsed:.1f}s")
        if gs: print(f"  ({gs} skipped - missing video files)")
        print(f"  AI is STABLE - safe for production")
    else:
        print(f"  {gf} FAILURES out of {total} ({elapsed:.1f}s)")
        print(f"  DO NOT DEPLOY - investigate failures first")
    print(f"{'=' * 62}\n")
    sys.exit(0 if gf == 0 else 1)

if __name__ == "__main__":
    main()
