FROM node:18-alpine

# Install ffmpeg for video processing
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /app

# Copy package files from backend directory
COPY backend/package*.json ./

# Install dependencies
RUN npm install --production

# Copy backend application files
COPY backend/ ./

# Expose port
EXPOSE 4000

# Default command (can be overridden in docker-compose)
CMD ["npm", "start"]

