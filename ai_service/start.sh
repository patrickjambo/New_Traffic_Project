cd /home/jambo/New_Traffic_Project/ai_service
kill $(lsof -t -i:8000) 2>/dev/null
/home/jambo/New_Traffic_Project/ai_service/venv/bin/python3 -m uvicorn main_light:app --host 0.0.0.0 --port 8000 > server.log 2>&1 &
sleep 3
