# Local Development Setup

## Quick Start

1. **Create `.env.local` file** in the root directory with:
```
VITE_API_URL=http://74.208.158.126:3000
```

2. **Install dependencies:**
```bash
npm install
```

3. **Run the development server:**
```bash
npm run dev
```

4. **Open your browser:**
```
http://localhost:3000
```

## What's Configured

- ✅ Frontend connects to backend at `http://74.208.158.126:3000`
- ✅ Backend is running in Docker with PostgreSQL
- ✅ All database operations go through the Docker backend
- ✅ No local database setup needed

## Troubleshooting

If port 3000 is busy, Vite will automatically use the next available port (3001, 3002, etc.)

