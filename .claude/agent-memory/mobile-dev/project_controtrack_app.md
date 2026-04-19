---
name: ControTrack Flutter app
description: A standalone Flutter fleet-tracking companion app built against the BookCars backend
type: project
---

ControTrack is a separate Flutter app at `C:\Users\mahmo\AndroidStudioProjects\controtrack\` that consumes the BookCars backend API (`https://api.carbook.controtrack.com`) for fleet tracking use cases (vehicles, positions, routes, geofences, events, drivers, maintenance, reports).

**Why:** It's a purpose-built fleet management frontend that reuses BookCars backend endpoints under `/api/fleet`, `/api/positions`, `/api/route`, `/api/geofences`, `/api/tracking/*`, `/api/events-center`, `/api/commands/*`, `/api/reports/*`. Admin sign-in uses `/api/sign-in/admin` with `{email, password, mobile: true}` and JWT passed back as `x-access-token` header.

**How to apply:** When the user references "ControTrack" it's this Flutter app — not the BookCars RN mobile app under `mobile/`. Stack: Flutter + flutter_bloc + go_router + dio + google_maps_flutter + flutter_secure_storage. Dark theme only (#0A0E1A bg, #00E5A0 primary). Auto-refresh fleet every 30s. Maps use embedded dark style JSON in `core/constants/app_constants.dart`. Google Maps API key hardcoded in AndroidManifest.xml and web/index.html.
