# Stage 1 — Build React frontend
FROM node:20-alpine AS builder
WORKDIR /build

# Install all dependencies (frontend + build tools)
COPY package*.json ./
RUN npm install

# Copy source files needed for build
COPY vite.config.ts tsconfig.json ./
COPY tender-editor/ ./tender-editor/

# Build — output goes to /build/dist
# .env.production is picked up automatically by Vite
RUN npm run build

# Stage 2 — Production server
# WORKDIR mirrors local dev: scraper-service/ sits next to dist/
# so path.join(__dirname, '../dist') resolves correctly in both envs
FROM node:20-alpine
WORKDIR /app/scraper-service

# Install backend dependencies only
COPY scraper-service/package*.json ./
RUN npm install --omit=dev

# Copy backend source
COPY scraper-service/ ./

# Copy built frontend — lands at /app/dist (one level up, matching ../dist)
COPY --from=builder /build/dist /app/dist

ENV APP_BASE_PATH=/gov-tender-editor
ENV SCRAPER_PORT=3001
EXPOSE 3001

CMD ["node", "index.js"]
