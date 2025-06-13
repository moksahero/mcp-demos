FROM node:18

WORKDIR /app

# Copy only the package files first to optimize layer caching
COPY package*.json ./

# Install deps (includes typescript, etc.)
RUN npm install

# Copy source code
COPY . .

# Default command: run the TypeScript script with tsx
CMD ["npx", "tsx", "sendNews.ts"]