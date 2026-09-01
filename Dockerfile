# Multi-stage Docker build for SignalProof
FROM node:20-alpine AS base
WORKDIR /app

# Copy root and package manifests for clean caching
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/

# Install dependencies across all workspaces
RUN npm ci

# Copy all source files
COPY . .

# Build client SPA and compile types
RUN npm run build

# Expose default application port
EXPOSE 8787

# Set default production environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8787

# Launch unified Fastify server (serves both API & React client)
CMD ["npm", "start"]
