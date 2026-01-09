# CityPulse: Mohali

Real-time Urban Stress Infrastructure for Smarter Cities

CityPulse is an open-source urban sensing platform that fuses environmental data into a Weighted Urban Stress Index (USI). Designed for the Sustainable Cities (SDG 11) track, it provides real-time visualization and Explainable AI analysis of urban health.

## Authors

- Tanvir Singh Sandhu(ReservedSnow) (Dev and AI Lead)
- Shaurya Jain (UI/UX)
- Swapneel Premchand
- Vansh Awasthi

## License

MIT License

## Quick Start

### Prerequisites

- Node.js (v18.0.0 or higher)
- Python (v3.11 or higher)
- Docker and Docker Compose
- A Mapbox Access Token (Available at mapbox.com)

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/citypulse.git
cd citypulse

# Copy environment files
cp FE/.env.example FE/.env
cp BE/.env.example BE/.env

# Add your Mapbox token to FE/.env

# Start all services
docker-compose up --build
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- ML Service: http://localhost:5001

### Option 2: Manual Setup

```bash
# Backend
cd BE
npm install
cp .env.example .env
npm run migrate
npm run seed
npm run dev

# ML Service (separate terminal)
cd Model
pip install -r requirements.txt
python api.py

# Frontend (separate terminal)
cd FE
npm install
cp .env.example .env
npm run dev
```



## Project Architecture

### System Overview

```
Sensor/Simulated Data (Mohali distributions)
           |
           v
Express API (ingestion + validation)
           |
           v
PostgreSQL + TimescaleDB (time-series)
           |
           v
ML Service (Python)
  - Isolation Forest (anomaly detection)
  - Forecasting (15-60 min horizon)
  - Explainability (Mohali baselines)
           |
           v
Express API (results + WebSockets)
           |
           v
Frontend UI (React + Mapbox)
```

### Software Stack

- Frontend: React, TypeScript, Tailwind CSS, Lucide Icons
- Mapping: Mapbox GL JS for 3D geospatial visualization
- Animation: Framer Motion for real-time pulsing alerts
- Backend: Node.js, Express, PostgreSQL with TimescaleDB
- ML: Python, scikit-learn, statsmodels

### Hardware Integration

This project is built to interface with physical sensing nodes:

- Microcontroller: ESP32
- Sensors: BME280 (Temp/Humidity), INMP441 (Noise), MQ-Series (Air Quality), PIR (Crowd Density)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/ingest | POST | Ingest sensor readings |
| /api/live | GET | Get latest data for all nodes |
| /api/history | GET | Get historical readings |
| /api/anomalies | GET | Get detected anomalies |
| /api/forecast | GET | Get stress predictions |
| /ws | WebSocket | Real-time data stream |

## The Urban Stress Index

The core of CityPulse is its ability to translate raw data into a human-readable score (0-100) using the following formula:

```
USI = (0.4 * Noise) + (0.25 * Temp) + (0.2 * AirQuality) + (0.15 * Density)
```

This score determines the "Pulse" of the city markers:

- Nominal (0-54): Cyan pulse
- Elevated (55-79): Amber pulse
- Critical (80-100): Rapid red pulse + AI Alert

## Mohali-Specific Features

- Zone-based baselines (commercial, residential, mixed)
- Time-of-day patterns (morning, afternoon, evening, night)
- Seasonal adjustments (summer heat, winter AQI from crop burning)
- Explainable anomaly detection with local context

## ML Model Training

### Generate Training Data

```bash
cd Model/training
python data_generator.py
# Generates 30 days of realistic Mohali sensor data
```

### Train Anomaly Model

```bash
python train_anomaly_model.py
# Trains Isolation Forest on generated data
# Saves model to Model/models/anomaly_model.pkl
```

### Model Configuration

- **Anomaly Detection**: Isolation Forest with 2% contamination rate
- **Forecasting**: Exponential smoothing with Mohali baselines
- **Explainability**: Severity-based explanations with deviation context

## Development

### Mock Mode (No Database Required)

```bash
cd BE
USE_MOCK=true npm run dev
```

### Running Tests

```bash
# Backend tests
cd BE && npm test

# ML tests
cd Model && python -m pytest
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request
