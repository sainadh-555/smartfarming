# SmartFarm AI™ — Python FastAPI Backend Deployment on Render

This backend receives real-time telemetry from your physical **ESP32 Dev Module** (DHT11, Soil Moisture, LDR) and serves it to your **SmartFarm AI Dashboard** hosted on GitHub Pages.

---

## 🚀 Free Deployment on Render (Step-by-Step)

### Step 1: Push Code to GitHub
Your repository already has the complete backend source code in the `backend/` folder and `render.yaml` at the root. Ensure your latest changes are pushed:
```bash
git push origin main
```

### Step 2: Create a Web Service on Render
1. Go to [https://render.com](https://render.com) and sign in (or create a free account with GitHub).
2. On your Render Dashboard, click **New +** and select **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect your `smartfarming` repository (`sainadh-555/smartfarming`).
4. Configure the Web Service settings:
   - **Name:** `smartfarm-ai-backend` (or your choice)
   - **Region:** Any (e.g., `Oregon (US West)` or `Frankfurt`)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`
5. Click **Create Web Service**.

### Step 3: Copy Your Public Render URL
Once the deploy status turns green (**Live**), copy your public URL from the top of the Render page:
```text
https://smartfarm-ai-backend.onrender.com
```

---

## 🔗 Step 4: Connect ESP32 and Frontend Dashboard

### 1. In Arduino IDE (`esp/esp.ino`):
Open `esp/esp.ino` and update the `BACKEND_URL` constant:
```cpp
const char* BACKEND_URL = "https://smartfarm-ai-backend.onrender.com/api/sensor-data";
```
Upload the sketch to your ESP32.

### 2. In SmartFarm AI Dashboard:
1. Open your live dashboard: [https://sainadh-555.github.io/smartfarming/#/settings](https://sainadh-555.github.io/smartfarming/#/settings)
2. In the **Render Cloud Backend Integration** card, paste your URL:
   `https://smartfarm-ai-backend.onrender.com`
3. Click **Test Connection** to verify green status.
4. Click **Save All Preferences**.
5. Your dashboard will now display **ESP32 LIVE** and show live physical sensor telemetry!

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Health check & API version |
| `POST` | `/api/sensor-data` | Receives JSON telemetry from ESP32 |
| `GET` | `/api/sensor-data` | Returns latest readings for all 4 quadrants |
| `GET` | `/api/sensor-data/history`| Returns time-series telemetry for charts |
| `POST` | `/api/irrigate` | Queues remote drip irrigation solenoid trigger |
| `GET` | `/api/irrigate/status` | Polled by ESP32 to check pump command state |
