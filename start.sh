#!/bin/bash

# Start the FastAPI backend in the background
echo "Starting backend..."
cd /app/backend
uvicorn main:app --host 127.0.0.1 --port 8000 &

# Start the Next.js frontend in the foreground
echo "Starting frontend..."
cd /app/frontend
npm start
