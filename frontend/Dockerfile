FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Command will be overridden by docker-compose for development
CMD ["pnpm", "run", "dev", "--host", "0.0.0.0", "--port", "3000"]