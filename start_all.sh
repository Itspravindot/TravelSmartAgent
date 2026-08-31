#!/bin/bash

echo "Starting TravelSmart AI..."

# Start Backend
echo "Starting FastAPI Backend..."
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "Starting Next.js Frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "TravelSmart AI is running!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "Press Ctrl+C to stop both."

# Wait for Ctrl+C
trap "echo 'Stopping all...'; kill $BACKEND_PID; kill $FRONTEND_PID; exit" INT
wait
