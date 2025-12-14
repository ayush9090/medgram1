# Local Frontend Setup

## Configuration

✅ **Frontend:** Runs locally on your machine
✅ **Backend API:** Runs on Docker server at `http://74.208.158.126:3000`
✅ **Database:** Runs on Docker server (internal, not exposed)
✅ **MinIO:** Runs on Docker server

## Setup Steps

1. **`.env.local` is already configured** with:
   ```
   VITE_API_URL=http://74.208.158.126:3000
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run frontend locally:**
   ```bash
   npm run dev
   ```

4. **Access the app:**
   - Frontend: `http://localhost:5173` (or next available port)
   - Backend API: `http://74.208.158.126:3000` (on server)
   - MinIO Console: `http://74.208.158.126:9001` (on server)

## How It Works

- Your local frontend connects to the remote backend API
- Backend connects to PostgreSQL and MinIO running in Docker on the server
- All data operations happen on the server
- You develop the frontend locally with hot reload

## Summary

- **Local:** Frontend development (React/Vite)
- **Server (Docker):** Backend API, PostgreSQL, MinIO, Worker

