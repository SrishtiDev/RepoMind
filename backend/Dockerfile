# ─── Build Stage ─────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies required by node-gyp (for tree-sitter bindings)
RUN apt-get update && apt-get install -y python3 make g++ 

# Copy package files and install all dependencies (including devDependencies)
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Runtime Stage ───────────────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

# Install git (required by simple-git for cloning repositories)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy production artifacts from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Set environment defaults
ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

# The start command is overridden by Render depending on the service type
# Web Service: npm start
# Background Worker: npm run worker:prod
CMD ["npm", "start"]
