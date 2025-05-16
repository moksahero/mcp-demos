# Use Node 20
FROM node:20

# Set working dir
WORKDIR /app

# Copy files
COPY . .

# Install deps
RUN npm install

# If you're using TypeScript:
RUN npm install -g ts-node typescript

# Expose your server port
EXPOSE 4000

# Start your server
CMD ["ts-node", "src/server.ts"]