# Local Development Setup - Everything Runs Locally

## Prerequisites
- Node.js installed
- Docker running (for database and MinIO)

## Step 1: Start Docker Services (Database & MinIO only)

In Portainer or via command line, start only these services:
- `medgram_db` (PostgreSQL)
- `medgram_storage` (MinIO)

Or expose PostgreSQL port temporarily:
```yaml
# In docker-compose.yml, temporarily add:
ports:
  - "5432:5432"  # For local connection
```

## Step 2: Setup Backend Locally

1. **Navigate to backend folder:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create `.env.local` file in backend folder:**
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=medgram_admin
POSTGRES_PASSWORD=secure_password_change_me
POSTGRES_DB=medgram_db

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ROOT_USER=minio_admin
MINIO_ROOT_PASSWORD=secure_minio_password_change_me
MINIO_PUBLIC_URL=http://localhost:9000

JWT_SECRET=dev-secret
```

4. **Run backend:**
```bash
npm run dev
```
Backend will run on `http://localhost:3000`

## Step 3: Setup Frontend Locally

1. **Go back to root folder:**
```bash
cd ..
```

2. **Install dependencies (if not done):**
```bash
npm install
```

3. **`.env.local` is already created** with:
```
VITE_API_URL=http://localhost:3000
```

4. **Run frontend:**
```bash
npm run dev
```
Frontend will run on `http://localhost:5173` (or next available port)

## Step 4: Access Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **MinIO Console:** http://localhost:9001

## Summary

✅ Frontend: Runs locally, connects to localhost:3000
✅ Backend: Runs locally, connects to Docker DB on localhost:5432
✅ Database: Runs in Docker (expose port 5432)
✅ MinIO: Runs in Docker (ports 9000, 9001)

