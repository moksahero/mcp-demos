FROM node:18

WORKDIR /app

# Copy only the package files first to optimize layer caching
COPY package*.json ./

# Install deps (includes typescript, etc.)
RUN npm install

# Copy source code
COPY . .

# Compile TypeScript to JS
RUN npx tsc

RUN npm run build
CMD ["npm", "start"]
