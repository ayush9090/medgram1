
# MedGram Deployment Guide

## How to Deploy on Portainer

**IMPORTANT:** You cannot deploy this stack using the Portainer "Web Editor" because it requires building custom Docker images from the `backend/` source code.

### Step 1: Create a Git Repository
1. Initialize a Git repository in this folder.
2. Commit all files (`docker-compose.yml`, `backend/`, etc.).
3. Push to GitHub, GitLab, or Bitbucket.

### Step 2: Deploy in Portainer
1. Log in to Portainer.
2. Go to **Stacks** > **Add stack**.
3. Select **Repository** (NOT Web editor).
4. **Repository URL:** Paste the URL of your git repo (e.g., `https://github.com/yourname/medgram.git`).
5. **Compose path:** Keep as `docker-compose.yml`.
6. Click **Deploy the stack**.

Portainer will now pull your code, build the `medgram_backend` image using the `backend/Dockerfile`, and start the services.

## Architecture
- **PostgreSQL:** Database on port 5432.
- **MinIO:** Object storage (S3 compatible) on ports 9000/9001.
- **Backend API:** Node.js/Express on port 3000.
- **Worker:** Background service for HLS video transcoding.

## Environment Variables
The stack uses the following default configuration (defined in `docker-compose.yml`).
Update `MINIO_PUBLIC_URL` to match your server IP if it changes.
