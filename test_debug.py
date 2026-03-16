import sys, json
from ai_service.lightweight_analyzer import LightweightTrafficAnalyzer

def test():
    analyzer = LightweightTrafficAnalyzer()
    res = analyzer.analyze_video("/home/jambo/New_Traffic_Project/backend/uploads/incident-1773343467021-364503938.mp4")
    print(json.dumps(res, indent=2))

test()
