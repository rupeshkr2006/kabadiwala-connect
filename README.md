# Kabadiwala Connect

A public static web application connecting scrap collectors and recyclers.

## Deployment
This repository is configured for native Vercel static hosting. The site entry point is the root `index.html`.

## Features
- English, Hindi and Marathi interface
- Collector and Recycler views
- Pickup request workflow
- OpenStreetMap/Leaflet location maps
- Browser geolocation with map/address fallback
- Take Photo and Choose from Gallery scrap capture
- Photo analysis with automatic form-field mapping
- Voice scrap-detail entry with browser or server transcription fallback
- Offline queue for photo analysis, price prediction and writes
- Browser speech recognition for scrap details

## Run locally
Open `index.html` with a local static web server.

The voice feature depends on browser Speech Recognition support and HTTPS/localhost permissions.
