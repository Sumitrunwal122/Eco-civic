# Civic Tech Waste Management App (`civic-tech-waste-app`)

Production-grade Civic Tech Waste Management application tailored specifically for **Indian Municipalities and Urban Local Bodies (ULBs)** following **Swachh Bharat Abhiyan** guidelines and Solid Waste Management Rules (MSW 2016).

---

## Key Features

1. **Swachh Bharat 4-Bin Waste Categorization**:
   - **Green Bin**: Wet Waste (Biodegradable / Organic / Kitchen food scraps)
   - **Blue Bin**: Dry Waste (Recyclable plastic, paper, cardboard, metal, glass)
   - **Black/Red Bin**: Domestic Hazardous & E-Waste (Batteries, bulbs, chemicals)
   - **Yellow/Marked Bag**: Sanitary Waste (Diapers, napkins, medical waste)

2. **Google Gemini Vision AI Engine**:
   - Automated waste visual parser returning bin colors, handling advisories, volume estimates, and safety instructions.
   - Built-in rule-based heuristic fallback for offline or zero-dependency operation.

3. **Real-Time Municipal Fleet Tracking**:
   - WebSockets telemetry stream (`/api/fleet/ws`) tracking live garbage compaction trucks, speeds, and ward routes on an interactive Leaflet OpenStreetMap.

4. **Sanitation Staff Muster Roll & Geo Attendance**:
   - One-tap worker Check-In / Check-Out with geographic GPS validation and shift duration calculation in `Asia/Kolkata` time.

5. **Role-Based Access Control (RBAC)**:
   - **Citizen**: Complaint filing, live truck map, instant AI waste categorizer.
   - **Sanitation Worker / Driver**: Geo check-in/out, assigned ward duties checklist.
   - **Municipal Officer / Admin**: Ward complaint triage, truck & staff allocation, live muster roll.

6. **Indian Municipal Data Validation**:
   - Phone numbers strictly validated to Indian format (`+91 [6-9]XXXXXXXXX`).
   - 6-digit Indian PIN codes (`[1-9][0-9]{5}`).
   - GeoJSON MongoDB `2dsphere` spatial indexing.

---

## Tech Stack

- **Backend**: Python 3.10+ / FastAPI / Motor (Async MongoDB driver) / Pydantic v2
- **Frontend**: React.js / Vite / TailwindCSS / Lucide Icons / Leaflet.js & React-Leaflet
- **AI Engine**: Google Gemini Vision API (`google-generativeai`)
- **Security**: Passlib (bcrypt), PyJWT (HS256)
- **Timezone**: `Asia/Kolkata` (IST)

---

## Directory Structure

```
civic-tech-waste-app/
├── .env.example
├── .gitignore
├── README.md
├── requirements.txt
├── docker-compose.yml
├── config/
│   ├── settings.py
│   └── logging_config.json
├── src/
│   ├── main.py
│   ├── api/
│   │   ├── routes_auth.py
│   │   ├── routes_waste.py
│   │   ├── routes_fleet.py
│   │   ├── routes_attendance.py
│   │   └── routes_admin.py
│   ├── ai_engine/
│   │   ├── gemini_vision.py
│   │   └── waste_classifier.py
│   ├── database/
│   │   ├── connection.py
│   │   └── schemas.py
│   └── utils/
│       ├── geo_helpers.py
│       ├── image_processor.py
│       └── logger.py
├── tests/
│   ├── test_api.py
│   └── test_ai_vision.py
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── components/
        │   ├── Navbar.jsx
        │   ├── OpenStreetMap.jsx
        │   ├── CameraCaptureModal.jsx
        │   └── ProtectedRoute.jsx
        ├── pages/
        │   ├── SignUp.jsx
        │   ├── SignIn.jsx
        │   ├── CitizenDashboard.jsx
        │   ├── AdminDashboard.jsx
        │   └── StaffDashboard.jsx
        ├── services/
        │   ├── api.js
        │   └── websocket.js
        ├── App.jsx
        └── main.jsx
```

---

## Quick Start Guide

### 1. Backend Setup

```bash
cd civic-tech-waste-app
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

Start backend FastAPI server:
```bash
python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```
Interactive API Documentation is available at `http://localhost:8000/docs`.

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Run Automated Tests

```bash
python -m pytest tests/ -v
```

---

## Docker Deployment

To launch full stack with MongoDB container:
```bash
docker-compose up --build
```
