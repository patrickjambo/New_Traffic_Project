#!/bin/bash

# Function to kill process on port
kill_port() {
  pid=$(lsof -t -i:$1)
  if [ -n "$pid" ]; then
    echo "Killing process on port $1 (PID: $pid)"
    kill -9 $pid
  fi
}

echo "Stopping existing services..."
kill_port 3000
kill_port 3001
kill_port 5173
kill_port 8000

# Stop conflicting docker containers
echo "Checking for conflicting Docker containers..."
if [ "$(docker ps -q -f name=trafficguard-db)" ]; then
    echo "Stopping conflicting container trafficguard-db..."
    docker stop trafficguard-db
    docker rm trafficguard-db
fi

# Start Database
echo "Starting Database..."
docker-compose up -d database
# Wait for DB to be ready
echo "Waiting for Database to be ready..."
sleep 10

# Start Backend
echo "Starting Backend..."
cd backend
nohup npm run dev > ../backend.log 2>&1 &
cd ..

# Start AI Service
echo "Starting AI Service..."
cd ai_service
source venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8000 --reload > ../ai_service.log 2>&1 &
cd ..

# Start Frontend
echo "Starting Frontend..."
cd government-dashboard
nohup npm run dev > ../frontend.log 2>&1 &
cd ..

echo "✅ All systems started!"
echo "Backend running on port 3000"
echo "AI Service running on port 8000"
echo "Frontend running on port 3001 (or 5173)"
echo "Logs are being written to backend.log, ai_service.log, and frontend.log"
