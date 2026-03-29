# BharatCRS - Civic Issue Reporting System 

BharatCRS is a modern, NEURO-SYMBOLIC Architecture powered **Civic Issue Reporting System** designed to streamline how citizens report municipal issues (potholes, water leaks, sanitation issues, etc.) and how departments track, route, and resolve them. It leverages cutting-edge Machine Learning embedded directly into a FastAPI backend to automatically categorize, prioritize, and route complaints to the appropriate department.

![BharatCRS Admin Dashboard](https://img.shields.io/badge/Status-Active-brightgreen)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb)

---

## 🌟 Key Features

### 👤 For Citizens
- **One-Click Issue Reporting:** Quick, seamless forms (including location pinning via maps) to raise complaints.
- **Voice & Image Support:** Describe issues visually through photos or via voice dictation.
- **Live Tracking:** Track exactly which department is handling the issue and see automated SLA deadlines based on issue severity.
- **Issue Heatmap:** Explore nearby complaints natively on a modern map interface.

### 🏢 For Municipal Departments / Admins
- **AI-Powered Triaging:** Complaints are automatically assigned a Domain (e.g., *Transportation*, *Sanitation*) and an exact Category (e.g., *Road Damage*, *Garbage*) via ONNX-based lightweight local ML models. No manual routing needed!
- **Predictive Analytics:** Department dashboards feature hotspot projections that foresee incoming civic issues based on historical trends natively built into the UI.
- **Real-Time Dashboards:** Interactive metric boards and analytics with full geographical context across various wards.
- **Cross-Department Workflows:** Unified management system allowing structured tracking of SLA performance.

---

## 🏗️ Technical Architecture

The platform runs on a modern decoupled architecture:

### 1. Frontend (React + Vite)
- **Framework:** React 18
- **Tooling:** Vite for lightning-fast HMR and building
- **UI & Styling:** Custom minimalist glass-morphism designs powered by `lucide-react` for iconography and `recharts` for rich analytics. Location plotting is handled using `@vis.gl/react-google-maps`.
- **Pages:** Split precisely into `Citizen` portals, `Department` portals, and global `Admin` visualizations.

### 2. Backend (FastAPI + Python)
- **Framework:** FastAPI (Asynchronous Python API logic)
- **Database:** MongoDB (via `motor` Async Driver) for dynamic document storage of complex, unstructured complaint metadata.
- **ML Integration:** Natively leverages pre-trained classification models via `onnxruntime` to ensure millisecond-latency categorization without hitting external APIs.

### 3. Machine Learning (PyTorch to ONNX pipeline)
- **Triaging Models:** Trained text classification to convert raw complaint text into localized categories (Domain, Issue Type, Priority).
- **FastText / Tokenization:** Token based embedding matching for high accuracy issue recognition. 

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)
- **MongoDB** (Local instance or Atlas cluster URI)

### Local Development Setup

#### 1. Setup the Backend
```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Create an environemnt file 
# Example .env layout:
# MONGODB_URL=mongodb://localhost:27017
# DB_NAME=bharatcrs_db
# API_HOST=0.0.0.0

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```
> **Note:** The backend automatically loads the ONNX ML models at startup to serve the AI Routing Engine endpoints.

#### 2. Setup the Frontend
```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies using npm, yarn, or pnpm
npm install

# Start the Vite development server
npm run dev
```

#### 3. Access Environments
- **Frontend Dashboard:** `http://localhost:5173`
- **Backend API & Swagger UI:** `http://localhost:8000/docs`

---

## 📂 Codebase Structure

```bash
📦 BharatCRS
 ┣ 📂 backend/         # FastAPI Server, Application Logic, Database Motor hooks
 ┃ ┣ 📂 app/           # Routers, Models, Graph execution, DB setup
 ┃ ┣ 📂 uploads/       # Directory for user uploaded media files
 ┃ ┗ 📜 pyproject.toml # Backend Configurations
 ┣ 📂 frontend/        # React application code 
 ┃ ┣ 📂 src/           # Pages, contexts, and helper tools
 ┃ ┣ 📂 public/        # Static assets
 ┃ ┗ 📜 package.json 
 ┗ 📂 ml/              # Model training notebooks, scripts and ONNX conversions
```

---

## 🤝 Contribution Guidelines
This project enforces structured directory layouts. Please ensure that all components (Admin, Department, Citizen) stay confined to their respective namespaces under `frontend/src/pages/`. All logic should properly interface with `complaintService` and avoid direct external API polling from the UI components.

## 🛡️ License
Proprietary / Closed Source. All Rights Reserved.