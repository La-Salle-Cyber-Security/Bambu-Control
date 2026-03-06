#!/bin/bash

echo "🖨 Starting Bambu-Control stack..."

cd "$(dirname "$0")"

node server/index.js &
echo $! > .server.pid

node bot/index.js &
echo $! > .bot.pid

echo "✅ Stack running"