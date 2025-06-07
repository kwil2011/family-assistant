# Use Node.js LTS version
FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgtk-3-0 \
    libnotify-dev \
    libgconf-2-4 \
    libnss3 \
    libxss1 \
    libasound2 \
    libxtst6 \
    xauth \
    xvfb \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV DISPLAY=:99

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps, electron, and electron-builder globally
RUN npm install --legacy-peer-deps && \
    npm install electron@28.0.0 --save-dev --legacy-peer-deps && \
    npm install -g electron-builder --legacy-peer-deps

# Copy app source
COPY . .

# Build the application
RUN npm run build:win

# Expose port for the application
EXPOSE 3000

# Start Xvfb and the application
CMD Xvfb :99 -screen 0 1024x768x16 & npm start 