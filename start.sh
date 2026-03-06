#!/bin/bash

echo "🖨 Starting Bambu-Control stack..."

# stop if any command fails
set -e

# go to script directory
cd "$(dirname "$0")"

# load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

echo "📡 Starting API server..."
node server/index.js &
SERVER_PID=$!

echo "🤖 Starting Discord bot..."
node bot/index.js &
BOT_PID=$!

echo "✅ Stack running"
echo "Server PID: $SERVER_PID"
echo "Bot PID: $BOT_PID"

# wait for processes
wait $SERVER_PID $BOT_PID