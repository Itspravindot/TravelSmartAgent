FROM python:3.10-slim

# Install Node.js
RUN apt-get update && apt-get install -y curl
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

WORKDIR /app

# Copy Backend and install dependencies
COPY backend/ /app/backend/
WORKDIR /app/backend
RUN pip install -r requirements.txt

# Copy Frontend and build
WORKDIR /app/frontend
COPY frontend/ /app/frontend/
RUN npm install
RUN npm run build

# Copy startup script
WORKDIR /app
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose Next.js port
EXPOSE 3000

# Environment variables to route API calls internally
ENV INTERNAL_API_URL=http://127.0.0.1:8000
ENV NEXT_PUBLIC_API_URL=/backend
ENV PORT=3000

CMD ["/app/start.sh"]
