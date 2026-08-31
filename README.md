# TravelSmart AI - Smart Tourism Recommendation Platform

TravelSmart AI is an AI-powered tourism recommendation platform that helps users plan complete trips using Artificial Intelligence and Big Data Analytics. 

## Features
- **Multi-Agent AI Travel Planner**: A ChatGPT-like interface that coordinates between multiple AI agents (Planner, Weather, Hotel) to generate a complete personalized trip itinerary using the Gemini API.
- **Big Data Pipeline Simulation**: A complete pipeline simulation that reads massive datasets (Hotels, Reviews, Weather), aggregates metrics, performs sentiment analysis, and predicts crowd indices.
- **Real-Time Analytics Dashboard**: A Recharts-powered dashboard showcasing live processed big data analytics, tracking tourism growth, sentiments, and average prices.
- **Premium UI/UX**: Built with Next.js 15, Tailwind CSS, Shadcn UI, and Framer Motion for a fluid, dynamic, and Apple/Airbnb inspired aesthetic.

## Architecture & Tech Stack
1. **Frontend**: Next.js 15, React, Tailwind CSS, Shadcn UI, Framer Motion, Recharts
2. **Backend**: FastAPI (Python), MongoDB (Simulated/Atlas)
3. **AI Engine**: Google Gemini API via `google-generativeai`
4. **Big Data Simulation**: Pandas, Python Data Processors

## Folder Structure
```
TravelSmartAI/
├── backend/                  # FastAPI Application and AI Agents
│   ├── main.py               # API Endpoints
│   ├── agent.py              # Multi-Agent Workflow Engine
│   ├── database.py           # MongoDB Connection config
│   ├── venv/                 # Python Virtual Environment
├── big_data/                 # Big Data Pipeline Simulator
│   ├── scripts/
│   │   ├── generate_datasets.py   # Script to generate dummy CSVs
│   │   ├── pipeline_simulator.py  # Map-Reduce/Spark simulation
├── datasets/                 # Local data storage
│   ├── processed/            # Output of the Big Data pipeline
├── frontend/                 # Next.js Application
│   ├── app/
│   │   ├── page.tsx          # Premium Landing Page
│   │   ├── planner/page.tsx  # AI Chat Interface
│   │   ├── dashboard/page.tsx # Big Data Recharts Dashboard
├── start_all.sh              # Single script to boot entire project
```

## Setup Instructions

### 1. Set Environment Variables
In the `backend` folder, create a `.env` file:
```env
GEMINI_API_KEY="your_google_gemini_api_key_here"
MONGO_URI="your_mongodb_atlas_uri"
```

### 2. Generate and Process Big Data
Ensure you have run the big data generator and processor at least once:
```bash
cd big_data/scripts
python3 generate_datasets.py
python3 pipeline_simulator.py
```
*(This creates `datasets/processed/dashboard_analytics.json` used by the FastAPI backend).*

### 3. Start the Platform
You can start both the frontend and backend servers with the provided bash script:
```bash
cd TravelSmartAI
./start_all.sh
```

**Links:**
- Frontend: `http://localhost:3000`
- Backend API Docs: `http://localhost:8000/docs`
