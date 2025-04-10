#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
npm install

# Create uploads directory if it doesn't exist
echo "Creating uploads directory..."
mkdir -p uploads

# Create database directory if it doesn't exist
echo "Creating database directory..."
mkdir -p db

# Start the server
echo "Starting server..."
node server.js
