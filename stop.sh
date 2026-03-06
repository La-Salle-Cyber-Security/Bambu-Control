#!/bin/bash

echo "🛑 Stopping Bambu-Control stack..."

if [ -f .server.pid ]; then
  kill $(cat .server.pid) 2>/dev/null
  rm .server.pid
fi

if [ -f .bot.pid ]; then
  kill $(cat .bot.pid) 2>/dev/null
  rm .bot.pid
fi

echo "✅ Stack stopped"