import sqlite3
import json
import os
from datetime import datetime

DATABASE_FILE = os.path.join(os.path.dirname(__file__), "travelsmart.db")

def get_db_connection():
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    try:
        with get_db_connection() as conn:
            conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """)
            conn.execute("""
            CREATE TABLE IF NOT EXISTS trips (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                destination TEXT NOT NULL,
                messages TEXT NOT NULL,
                username TEXT NOT NULL,
                coordinates TEXT,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE
            );
            """)
            conn.commit()
            print("SQLite database and tables initialized successfully.")
    except Exception as e:
        print(f"Error initializing SQLite database: {e}")

# Initialize database on import
init_db()

def get_user(username: str):
    if not username:
        return None
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE username = ?", (username.strip().lower(),)).fetchone()
        if row:
            return dict(row)
        return None

def create_user(username: str, password_hash: str, salt: str):
    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO users (username, password_hash, salt, created_at) VALUES (?, ?, ?, ?)",
            (username.strip().lower(), password_hash, salt, datetime.utcnow().isoformat())
        )
        conn.commit()

def get_trips(username: str):
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM trips WHERE username = ? ORDER BY updated_at DESC",
            (username.strip().lower(),)
        ).fetchall()
        trips = []
        for r in rows:
            trip = dict(r)
            trip["messages"] = json.loads(trip["messages"])
            trip["coordinates"] = json.loads(trip["coordinates"]) if trip["coordinates"] else None
            trips.append(trip)
        return trips

def get_trip(trip_id: str):
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM trips WHERE id = ?", (trip_id,)).fetchone()
        if row:
            trip = dict(row)
            trip["messages"] = json.loads(trip["messages"])
            trip["coordinates"] = json.loads(trip["coordinates"]) if trip["coordinates"] else None
            return trip
        return None

def save_trip(trip_id: str, name: str, destination: str, messages: list, username: str, coordinates: list = None):
    messages_json = json.dumps(messages)
    coords_json = json.dumps(coordinates) if coordinates else None
    now_str = datetime.utcnow().isoformat()
    
    with get_db_connection() as conn:
        row = conn.execute("SELECT id FROM trips WHERE id = ?", (trip_id,)).fetchone()
        if row:
            conn.execute(
                "UPDATE trips SET name = ?, destination = ?, messages = ?, username = ?, coordinates = ?, updated_at = ? WHERE id = ?",
                (name, destination, messages_json, username.strip().lower(), coords_json, now_str, trip_id)
            )
        else:
            conn.execute(
                "INSERT INTO trips (id, name, destination, messages, username, coordinates, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (trip_id, name, destination, messages_json, username.strip().lower(), coords_json, now_str)
            )
        conn.commit()
    
    return {
        "id": trip_id,
        "name": name,
        "destination": destination,
        "messages": messages,
        "username": username,
        "coordinates": coordinates,
        "updated_at": now_str
    }

def rename_trip(trip_id: str, name: str):
    now_str = datetime.utcnow().isoformat()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE trips SET name = ?, updated_at = ? WHERE id = ?", (name, now_str, trip_id))
        conn.commit()
        return cursor.rowcount > 0

def delete_trip(trip_id: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM trips WHERE id = ?", (trip_id,))
        conn.commit()
        return cursor.rowcount > 0
