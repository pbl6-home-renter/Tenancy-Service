#!/bin/sh
set -e

echo "Running migrations..."
npm run migration:run:prod

echo "Starting application..."
node dist/main.js
