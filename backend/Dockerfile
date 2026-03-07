FROM node:20-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

RUN npm ci

# Copy source code
COPY src/ ./src/
COPY .env* ./

EXPOSE 5000

CMD ["node", "src/index.js"]
