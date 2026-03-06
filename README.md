# Bambu-Control

A local control system for **Bambu Lab printers** that exposes a simple API and a **Discord bot interface**.

This project allows you to control and monitor your printer from Discord while keeping everything running locally on your network.

Features currently include:

* Printer telemetry monitoring
* Chamber light control
* Morse-code light signaling
* Event notifications
* Discord slash command control
* Local REST API for integrations

Everything runs locally and communicates with the printer through **MQTT**.

---

# Architecture

```
Discord
   │
   │ Slash Commands
   ▼
Discord Bot (Node.js)
   │
   │ HTTP API
   ▼
Local API Server
   │
   │ MQTT
   ▼
Bambu Printer
```

The printer communicates through the local MQTT broker exposed by the printer firmware.

---

# Features

## Printer Status

```
/printer status
```

Shows:

* printer state
* current file
* progress
* layer
* remaining time
* nozzle temperature
* bed temperature

---

## Chamber Light Control

```
/printer led state:on
/printer led state:off
```

Controls the printer chamber light.

---

## Morse Code Signaling

```
/printer morse text:HELLO
```

Flashes the chamber light using Morse code.

Useful for:

* notifications
* debugging
* printer signals
* general nerdiness

---

## Event Notifications

The API server exposes an event endpoint.

Example:

```bash
curl -X POST http://localhost:3000/api/events/test \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

This can trigger Discord notifications.

---

# Installation

## Requirements

* Node.js 18+
* Bambu Lab printer on local network
* Printer access code
* Printer IP address

---

## Clone the Repository

```
git clone https://github.com/YOURNAME/bambu-control
cd bambu-control
```

---

## Install Dependencies

```
npm install
```

---

## Configure Environment

Create a `.env` file.

Example:

```
PRINTER_IP=192.168.1.50
PRINTER_SERIAL=XXXXXXXXXXXX
PRINTER_ACCESS_CODE=XXXXXX

DISCORD_TOKEN=YOUR_BOT_TOKEN
DISCORD_GUILD_ID=YOUR_SERVER_ID

API_TOKEN=RANDOM_SECURE_TOKEN
```

---

# Running the System

Start everything with:

```
./start.sh
```

This launches:

* API server
* Discord bot

---

## Stop the System

```
./stop.sh
```

---

# API

Base URL

```
http://localhost:3000
```

---

## Printer Status

```
GET /api/printer/status
```

---

## Chamber Light

```
POST /api/printer/led
```

Body:

```
{
  "state": "on"
}
```

---

## Morse Code

```
POST /api/printer/morse
```

Body:

```
{
  "text": "HELLO"
}
```

---

## Events

```
POST /api/events/test
```

Used to trigger notifications.

---

# Project Structure

```
bambu-control
│
├── bot
│   └── index.js
│
├── server
│   ├── index.js
│   ├── printerBridge.js
│   └── mqtt.js
│
├── start.sh
├── stop.sh
├── package.json
└── README.md
```

---

# Security Notes

This project is designed to run **inside your local network**.

Do not expose the API server to the public internet unless you:

* add authentication
* add rate limiting
* add HTTPS

---

# Future Plans

Possible future features:

* camera snapshots
* Discord printer alerts
* print start / stop commands
* filament notifications
* live dashboard
* multi-printer support

---

# License

MIT License

---

# Disclaimer

This project is not affiliated with **Bambu Lab**.

Use at your own risk.
