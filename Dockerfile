# ==========================================
#  K-Stock Insight - Dockerfile
# ==========================================
FROM node:22-alpine

# Set container working directory
WORKDIR /app

# Copy package configuration files for dependency caching
COPY package*.json ./

# Install only production dependencies for lightweight image size
RUN npm ci --only=production

# Copy application source code files
COPY . .

# Ensure persistent data directory exists inside container
RUN mkdir -p /app/data

# Expose server listener port
EXPOSE 3000

# Setup production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Execute server entry point
CMD ["node", "server.js"]
