# Use Node.js LTS light image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and Prisma schema first to leverage caching
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies including devDependencies to build TypeScript
RUN npm ci

# Copy the rest of the backend files
COPY . .

# Build the TypeScript project
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npm run build

# Remove development dependencies to keep the image slim
RUN npm prune --production

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080

# Environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Start the application (running migrations then the compiled server)
CMD ["npm", "start"]
