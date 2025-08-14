#!/bin/bash

# Promptlyzer Lite Quick Launch Script

echo "Starting Promptlyzer Lite..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "ERROR: Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "WARNING: Please edit .env file and add your API keys!"
    echo "Required: OPENAI_API_KEY or ANTHROPIC_API_KEY"
    read -p "Press enter after adding your API keys..."
fi

# Build and start containers
echo "Building containers..."
docker-compose build

echo "Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 5

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "SUCCESS: Promptlyzer is running!"
    echo ""
    echo "Access points:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:8000"
    echo "   API Docs: http://localhost:8000/docs"
    echo ""
    echo "To view logs: docker-compose logs -f"
    echo "To stop: docker-compose down"
else
    echo "ERROR: Failed to start services. Check logs with: docker-compose logs"
    exit 1
fi