#!/bin/bash

# Frontend Deployment Script for Asset Lifecycle Management
# Usage: ./deploy.sh [production|development]

set -e

ENVIRONMENT=${1:-development}
echo "🚀 Starting frontend deployment for environment: $ENVIRONMENT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "vite.config.js" ]; then
    print_error "Please run this script from the frontend directory"
    exit 1
fi

print_status "Checking prerequisites..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

print_status "Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning "No .env file found. Please create one from env.example"
    cp env.example .env
    print_warning "Please edit the .env file with your configuration"
    exit 1
fi

print_status "Building frontend for production..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    print_error "Frontend build failed"
    exit 1
fi

print_status "Frontend built successfully!"
print_status "Build output is in the 'dist' directory"
print_status "Copy the contents of 'dist' to your web server's document root"

print_status "Frontend deployment completed successfully!"
print_status "Next steps:"
print_status "1. Copy dist/ contents to your web server"
print_status "2. Configure your web server to serve the static files"
print_status "3. Ensure your API base URL is correctly configured in .env"
