from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import database
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional
import json
import os
import uuid

app = FastAPI(title="TravelSmart AI Backend")

# Allow CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../'))
PROCESSED_DIR = os.path.join(BASE_DIR, 'datasets', 'processed')

class ChatMessage(BaseModel):
    role: str
    content: str
    tasks: Optional[List[str]] = None

class TripCreate(BaseModel):
    id: Optional[str] = None
    name: str
    destination: str
    messages: List[ChatMessage]
    username: str
    coordinates: Optional[List[float]] = None

class TripUpdate(BaseModel):
    name: str

class UserRegister(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

@app.get("/")
def read_root():
    return {"message": "Welcome to TravelSmart AI API"}

@app.post("/api/auth/register")
def register_user(data: UserRegister):
    username = data.username.strip().lower()
    password = data.password
    
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")
        
    # Check if user already exists
    existing = database.get_user(username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
        
    # Hash password with salt
    import hashlib
    salt = uuid.uuid4().hex
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    
    database.create_user(username, hashed, salt)
    
    return {"status": "success", "message": "User registered successfully", "username": username}

@app.post("/api/auth/login")
def login_user(data: UserLogin):
    username = data.username.strip().lower()
    password = data.password
    
    user = database.get_user(username)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid username or password")
        
    # Verify password
    import hashlib
    salt = user["salt"]
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    if hashed != user["password_hash"]:
        raise HTTPException(status_code=400, detail="Invalid username or password")
        
    return {"status": "success", "message": "Logged in successfully", "username": username}

@app.get("/api/analytics")
def get_analytics():
    """Returns Big Data processed analytics for the Dashboard."""
    # Attempt to read from the simulated Spark output
    try:
        with open(os.path.join(PROCESSED_DIR, 'dashboard_analytics.json'), 'r') as f:
            data = json.load(f)
            return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": f"Analytics data not found. Please run the Big Data pipeline first. Error: {e}"}

@app.post("/api/chat")
def chat_with_agent(query: dict):
    """Endpoint to interact with the Multi-Agent AI system."""
    user_message = query.get("message")
    if not user_message:
        return {"error": "Message is required"}
    
    from agent import travel_agent_system
    result = travel_agent_system.planner_agent(user_message)
    return result

@app.get("/api/trips")
def get_trips(username: str):
    """Fetch all saved trips for a specific user."""
    try:
        trips = database.get_trips(username)
        return trips
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/trips/{trip_id}")
def get_trip(trip_id: str):
    """Fetch a single trip's details by ID."""
    try:
        trip = database.get_trip(trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
        return trip
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/trips")
def save_trip(trip_data: TripCreate):
    """Create or update a trip."""
    try:
        messages_list = [msg.dict() for msg in trip_data.messages]
        trip_id = trip_data.id
        if not trip_id:
            trip_id = uuid.uuid4().hex
            
        doc = database.save_trip(
            trip_id=trip_id,
            name=trip_data.name,
            destination=trip_data.destination,
            messages=messages_list,
            username=trip_data.username,
            coordinates=trip_data.coordinates
        )
        return doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/trips/{trip_id}")
def rename_trip(trip_id: str, data: TripUpdate):
    """Rename a trip."""
    try:
        success = database.rename_trip(trip_id, data.name)
        if not success:
            raise HTTPException(status_code=404, detail="Trip not found")
            
        return {"status": "success", "message": "Trip renamed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/trips/{trip_id}")
def delete_trip(trip_id: str):
    """Delete a trip."""
    try:
        success = database.delete_trip(trip_id)
        if not success:
            raise HTTPException(status_code=404, detail="Trip not found")
            
        return {"status": "success", "message": "Trip deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
