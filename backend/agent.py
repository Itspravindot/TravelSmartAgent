import os
import json
import requests
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(override=True)

# Configure API Keys
GENAI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)
else:
    print("Warning: GEMINI_API_KEY not set. Agents will use mock responses.")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../'))
DATASETS_DIR = os.path.join(BASE_DIR, 'datasets')
PROCESSED_DIR = os.path.join(DATASETS_DIR, 'processed')

COORDINATES = {
    "goa": [15.2993, 74.1240],
    "manali": [32.2396, 77.1887],
    "jaipur": [26.9124, 75.7873],
    "kerala": [10.8505, 76.2711],
    "sikkim": [27.5330, 88.5122],
    "andaman": [11.7401, 92.6586],
    "udaipur": [24.5854, 73.7125],
    "agra": [27.1767, 78.0081],
    "rishikesh": [30.0869, 78.2676],
    "darjeeling": [27.0410, 88.2627],
    "kyoto": [35.0116, 135.7681],
    "shimla": [31.1048, 77.1734],
    "ooty": [11.4102, 76.6950],
    "ladakh": [34.1526, 77.5771],
    "paris": [48.8566, 2.3522],
    "tokyo": [35.6764, 139.6500],
    "london": [51.5074, -0.1278],
    "new york": [40.7128, -74.0060],
    "rome": [41.9028, 12.4964],
    "bali": [-8.4095, 115.1889],
    "maldives": [3.2028, 73.2207],
    "dubai": [25.2048, 55.2708],
    "singapore": [1.3521, 103.8198],
    "bangkok": [13.7563, 100.5018],
    "sydney": [-33.8688, 151.2093],
    "barcelona": [41.3851, 2.1734],
    "amsterdam": [52.3676, 4.9041],
    "cape town": [-33.9249, 18.4241],
    "cairo": [30.0444, 31.2357],
    "venice": [45.4408, 12.3155]
}

class TravelSmartAgents:
    def __init__(self):
        self.api_key = GENAI_API_KEY
        self.model = self._get_model()

    def _get_model(self):
        if not self.api_key:
            return None
            
        system_instruction = "You are a helpful travel assistant."
        try:
            instructions_path = os.path.join(BASE_DIR, 'backend', 'training_instructions.txt')
            with open(instructions_path, 'r') as f:
                system_instruction = f.read()
        except Exception as e:
            print(f"Could not load training instructions: {e}")
            
        return genai.GenerativeModel(
            'gemini-flash-latest',
            system_instruction=system_instruction
        )

    def weather_agent(self, destination: str) -> str:
        """Fetches live weather from Open-Meteo API using coordinates."""
        dest_key = destination.lower().strip()
        coords = COORDINATES.get(dest_key)
        
        # Fallback to look up partially matching key
        if not coords:
            for k, v in COORDINATES.items():
                if k in dest_key or dest_key in k:
                    coords = v
                    break
                    
        if not coords:
            return f"Weather currently unavailable (unknown coordinates for {destination})."
            
        lat, lon = coords
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code"
        try:
            response = requests.get(url, timeout=5)
            data = response.json()
            if 'current' in data:
                current = data['current']
                temp = current.get('temperature_2m', 'Unknown')
                apparent_temp = current.get('apparent_temperature', 'Unknown')
                humidity = current.get('relative_humidity_2m', 'Unknown')
                
                # Standard WMO Weather interpretation codes
                wmo_codes = {
                    0: "Clear sky",
                    1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
                    45: "Fog", 48: "Depositing rime fog",
                    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
                    56: "Light freezing drizzle", 57: "Dense freezing drizzle",
                    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
                    66: "Light freezing rain", 67: "Heavy freezing rain",
                    71: "Slight snow fall", 73: "Moderate snow fall", 75: "Heavy snow fall",
                    77: "Snow grains",
                    80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
                    85: "Slight snow showers", 86: "Heavy snow showers",
                    95: "Slight or moderate thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail"
                }
                code = current.get('weather_code', 0)
                desc = wmo_codes.get(code, "Clear sky")
                
                return f"Currently {temp}°C (feels like {apparent_temp}°C) with {desc.lower()} and {humidity}% humidity."
            return f"Could not parse weather data from Open-Meteo for {destination}."
        except Exception as e:
            return f"Error fetching weather: {e}"

    def hotel_agent(self, destination: str, budget: int) -> str:
        """Fetches live hotels from Google Maps Places API."""
        if not GOOGLE_MAPS_API_KEY:
            return f"Recommended hotels in {destination} under ₹{budget}: Taj Resort (₹{budget-2000}), Sea View Inn (₹{budget-5000})."
            
        url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?query=hotels+in+{destination}&key={GOOGLE_MAPS_API_KEY}"
        try:
            response = requests.get(url)
            data = response.json()
            if response.status_code == 200 and data.get('results'):
                hotels = []
                for place in data['results'][:3]:
                    name = place.get('name')
                    rating = place.get('rating', 'N/A')
                    hotels.append(f"{name} ({rating} stars)")
                return f"Top hotels found in {destination}: " + ", ".join(hotels)
            return "No hotels found or error occurred."
        except Exception as e:
            return f"Error fetching hotels: {e}"

    def crowd_prediction_agent(self, destination: str) -> str:
        """Fetches crowd prediction from our PySpark analytics."""
        try:
            with open(os.path.join(PROCESSED_DIR, 'dashboard_analytics.json'), 'r') as f:
                data = json.load(f)
                crowd_data = next((item for item in data.get('crowd_prediction', []) if item["destination"].lower() == destination.lower()), None)
                if crowd_data:
                    return f"Crowd index is {crowd_data['crowd_index']}/1.0. Expect moderate traffic."
        except Exception:
            pass
        return "Crowd data currently unavailable."

    def planner_agent(self, user_request: str) -> dict:
        """The main orchestrator that breaks down the task."""
        from itineraries import ITINERARIES
        
        # Extended list of destinations mapping lowercase keys to display names
        dest_map = {k: k.title() for k in ITINERARIES.keys()}
        dest_map["new york"] = "New York"
        dest_map["cape town"] = "Cape Town"
        
        cleaned_request = user_request.lower().strip()
        
        # Simple synonym / typo mapping
        typos = {
            "kerla": "kerala",
            "goaa": "goa",
            "ny": "new york",
            "nyc": "new york",
            "new york city": "new york",
            "capetown": "cape town",
            "venise": "venice",
            "barca": "barcelona"
        }
        
        # Apply typo correction
        for typo, correction in typos.items():
            if typo in cleaned_request:
                cleaned_request = cleaned_request.replace(typo, correction)
                
        # Find match
        matched_key = None
        for key in ITINERARIES.keys():
            if key in cleaned_request:
                matched_key = key
                break
                
        # If no direct match, check sub-words
        if not matched_key:
            words = [w for w in cleaned_request.split() if len(w) > 3]
            for w in words:
                for key in ITINERARIES.keys():
                    if w in key:
                        matched_key = key
                        break
                if matched_key:
                    break

        if matched_key:
            extracted_dest = dest_map[matched_key]
            extracted_budget = 20000 # default mock
            
            # Execute sub-agents
            weather_info = self.weather_agent(extracted_dest)
            hotel_info = self.hotel_agent(extracted_dest, extracted_budget)
            crowd_info = self.crowd_prediction_agent(extracted_dest)
            
            local_itinerary = ITINERARIES[matched_key]
            
            # Combine the local pre-generated itinerary with live info from sub-agents
            final_plan = f"""## 🗺️ Travel Smart Itinerary: {extracted_dest}

### 🌦️ Local Trip Insights:
* **Current Weather**: {weather_info}
* **Hotel Suggestions**: {hotel_info}
* **Crowd Traffic**: {crowd_info}

---

{local_itinerary}"""

            tasks = [
                "Planner Agent analyzed request.",
                f"Matched request with pre-generated data for {extracted_dest}.",
                f"Weather Tool checked weather for {extracted_dest}.",
                f"Hotel Tool fetched hotels under budget.",
                f"Big Data Engine predicted crowd traffic.",
                "Response Generator compiled the final itinerary."
            ]
        else:
            # Fallback for unsupported destinations: show supported ones
            extracted_dest = "List of Cities"
            
            india_cities = ["Goa", "Manali", "Jaipur", "Kerala", "Sikkim", "Andaman", "Udaipur", "Agra", "Rishikesh", "Darjeeling", "Shimla", "Ooty", "Ladakh"]
            asia_cities = ["Kyoto", "Tokyo", "Bali", "Maldives", "Dubai", "Singapore", "Bangkok"]
            europe_cities = ["Paris", "London", "Rome", "Barcelona", "Amsterdam", "Venice"]
            other_cities = ["New York", "Sydney", "Cape Town", "Cairo"]
            
            final_plan = f"""### 📍 Destination Not Found

Sorry, I couldn't match your request to one of our supported destinations. We have high-quality, pre-planned itineraries for **30 popular destinations**:

* **India**: {", ".join(india_cities)}
* **Asia**: {", ".join(asia_cities)}
* **Europe**: {", ".join(europe_cities)}
* **Other**: {", ".join(other_cities)}

Please ask about one of these places! (e.g., *"Plan a trip to Tokyo"* or *"Tell me about Jaipur"*)."""

            tasks = [
                "Planner Agent analyzed request.",
                "Could not find a matching pre-generated destination.",
                "Generated list of supported destinations."
            ]
            
        return {
            "destination": extracted_dest,
            "tasks_executed": tasks,
            "plan": final_plan,
            "coordinates": COORDINATES.get(matched_key) if matched_key else None
        }

# Singleton instance
travel_agent_system = TravelSmartAgents()
