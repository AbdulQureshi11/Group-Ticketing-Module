# API Specification

This document outlines the API endpoints for the Flight Group Ticketing Module.

## Endpoints

- `/auth` - Authentication
- `/agencies` - Agency management
- `/users` - User management
- `/groups` - Group management
- `/bookings` - Booking management
- `/passengers` - Passenger management
- `/pricing` - Pricing management
- `/settings` - Settings management
- `/reports` - Reporting
- `/status-machine` - Status machine
- `/jobs` - Background jobs

## Authentication

All endpoints require authentication except `/auth/login` and `/auth/register`.

Use Bearer token in Authorization header.
