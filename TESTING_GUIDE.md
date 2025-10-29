# Testing Guide: Group Ticketing Module

This guide provides instructions for manual testing and structure validation of PRD requirements using terminal tools.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Structure Validation](#structure-validation)
4. [Manual Testing](#manual-testing)
5. [Database Testing](#database-testing)
6. [Performance Testing](#performance-testing)
7. [Security Testing](#security-testing)

---

## Prerequisites

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Setup Database
```bash
# Create database
mysql -u root -p -e "CREATE DATABASE flight_group_db;"

# Run migrations (if using migration files)
npm run migrate

# Or use the sync script
node src/database/migrations/migrate.js
```

### 4. Start Redis
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or using local Redis
redis-server
```

---

## Quick Start

### Run Structure Validation and API Tests
```bash
# Make scripts executable
chmod +x test-requirements.sh test-api-endpoints.sh

# Run structure validation
./test-requirements.sh

# Start the server (in another terminal)
npm start

# Run API endpoint tests
./test-api-endpoints.sh
```

---

## Structure Validation

### Run Structure Tests
```bash
# Run structure validation script
./test-requirements.sh
```

This script checks that all required files, dependencies, and configurations are in place according to the PRD requirements.

---

## Manual Testing

### 1. Test Authentication (Requirement 4.1)

```bash
# Login as Admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "agencyCode": "ABC123",
    "username": "admin",
    "password": "password123"
  }'

# Save the token
export TOKEN="<your-token-here>"

# Test refresh token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Authorization: Bearer $TOKEN"

# Test logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Test Group Creation (Requirement 4.2)

```bash
# Create a flight group
curl -X POST http://localhost:3000/api/groups \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "carrierCode": "PK",
    "flightNumber": "301",
    "origin": "LHE",
    "destination": "KHI",
    "departureTimeUtc": "2025-12-15T10:00:00Z",
    "arrivalTimeUtc": "2025-12-15T12:00:00Z",
    "departureTimeLocal": "2025-12-15T15:00:00+05:00",
    "arrivalTimeLocal": "2025-12-15T17:00:00+05:00",
    "pnrMode": "GROUP_PNR",
    "baggageRule": "2PC",
    "fareNotes": "Non-refundable",
    "salesStart": "2025-11-01T00:00:00Z",
    "salesEnd": "2025-12-14T23:59:59Z",
    "seatBuckets": [
      {
        "paxType": "ADT",
        "totalSeats": 50,
        "baseFare": 15000,
        "taxAmount": 2000,
        "feeAmount": 500,
        "currency": "PKR"
      },
      {
        "paxType": "CHD",
        "totalSeats": 20,
        "baseFare": 12000,
        "taxAmount": 1500,
        "feeAmount": 500,
        "currency": "PKR"
      }
    ]
  }'

# List groups
curl -X GET "http://localhost:3000/api/groups?status=PUBLISHED" \
  -H "Authorization: Bearer $TOKEN"

# Get specific group
curl -X GET http://localhost:3000/api/groups/<group-id> \
  -H "Authorization: Bearer $TOKEN"

# Update group status
curl -X PATCH http://localhost:3000/api/groups/<group-id> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "PUBLISHED"}'
```

### 3. Test Booking Flow (Requirements 4.3-4.5)

```bash
# Create booking request
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "flightGroupId": "<group-id>",
    "passengers": {
      "adults": 2,
      "children": 1,
      "infants": 0
    },
    "remarks": "Family trip"
  }'

# Save booking ID
export BOOKING_ID="<booking-id>"

# Approve booking (Manager/Admin)
curl -X POST http://localhost:3000/api/bookings/$BOOKING_ID/approve \
  -H "Authorization: Bearer $TOKEN"

# Upload payment proof
curl -X POST http://localhost:3000/api/bookings/$BOOKING_ID/payment-proof \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileUrl": "https://example.com/receipt.pdf",
    "bankName": "HBL",
    "amount": 52500,
    "currency": "PKR",
    "referenceNo": "TXN123456789"
  }'

# Mark as paid
curl -X POST http://localhost:3000/api/bookings/$BOOKING_ID/mark-paid \
  -H "Authorization: Bearer $TOKEN"

# Issue tickets
curl -X POST http://localhost:3000/api/bookings/$BOOKING_ID/issue \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Test PNR Management (Requirement 4.6)

```bash
# Validate PNR format
curl -X GET http://localhost:3000/api/pnr/validate/ABC123 \
  -H "Authorization: Bearer $TOKEN"

# Get booking PNR info
curl -X GET http://localhost:3000/api/pnr/booking/$BOOKING_ID \
  -H "Authorization: Bearer $TOKEN"

# Assign PNR to booking
curl -X POST http://localhost:3000/api/pnr/assign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "'$BOOKING_ID'",
    "flightGroupId": "<group-id>"
  }'
```

### 5. Test Passenger Management

```bash
# Add passengers to booking
curl -X POST http://localhost:3000/api/bookings/$BOOKING_ID/passengers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "passengers": [
      {
        "paxType": "ADT",
        "title": "Mr",
        "firstName": "John",
        "lastName": "Doe",
        "dob": "1990-05-15",
        "nationality": "PK",
        "passportNo": "AB1234567",
        "passportExpiry": "2030-05-15"
      },
      {
        "paxType": "ADT",
        "title": "Mrs",
        "firstName": "Jane",
        "lastName": "Doe",
        "dob": "1992-08-20",
        "nationality": "PK",
        "passportNo": "AB7654321",
        "passportExpiry": "2030-08-20"
      }
    ]
  }'

# Update passenger
curl -X PATCH http://localhost:3000/api/passengers/<passenger-id> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketNo": "PK-20251215-123456"
  }'
```

---

## Database Testing

### 1. Check Database Structure

```bash
# Connect to MySQL
mysql -u root -p flight_group_db

# List all tables
SHOW TABLES;

# Check specific table structure
DESCRIBE agencies;
DESCRIBE users;
DESCRIBE flight_groups;
DESCRIBE booking_requests;

# Check indexes
SHOW INDEX FROM booking_requests;

# Check foreign keys
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'flight_group_db'
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

### 2. Verify Data Integrity

```bash
# Check seat counter consistency
SELECT 
  fg.id,
  fg.carrier_code,
  fg.flight_number,
  gsb.pax_type,
  gsb.total_seats,
  gsb.seats_on_hold,
  gsb.seats_issued,
  (gsb.total_seats - gsb.seats_on_hold - gsb.seats_issued) as available
FROM flight_groups fg
JOIN group_seat_buckets gsb ON fg.id = gsb.flight_group_id;

# Check booking status distribution
SELECT status, COUNT(*) as count
FROM booking_requests
GROUP BY status;

# Check expired holds
SELECT id, status, hold_expires_at
FROM booking_requests
WHERE hold_expires_at < NOW()
  AND status IN ('REQUESTED', 'APPROVED', 'PAYMENT_PENDING');
```

### 3. Test Transactions

```bash
# Start MySQL transaction test
mysql -u root -p flight_group_db << EOF
START TRANSACTION;

-- Simulate booking approval
UPDATE group_seat_buckets 
SET seats_on_hold = seats_on_hold + 2
WHERE flight_group_id = '<group-id>' AND pax_type = 'ADT';

-- Check if update succeeded
SELECT * FROM group_seat_buckets WHERE flight_group_id = '<group-id>';

-- Rollback to test
ROLLBACK;

-- Verify rollback
SELECT * FROM group_seat_buckets WHERE flight_group_id = '<group-id>';
EOF
```

---

## Performance Testing

### 1. Load Testing with Apache Bench

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test login endpoint
ab -n 1000 -c 10 -p login.json -T application/json \
  http://localhost:3000/api/auth/login

# Create login.json
echo '{"agencyCode":"ABC123","username":"admin","password":"password123"}' > login.json

# Test groups listing
ab -n 1000 -c 10 -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/groups
```

### 2. Concurrent Booking Test

```bash
# Create a script to test race conditions
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/bookings \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "flightGroupId": "<group-id>",
      "passengers": {"adults": 5, "children": 0, "infants": 0}
    }' &
done
wait

# Check seat counters for consistency
mysql -u root -p flight_group_db -e \
  "SELECT * FROM group_seat_buckets WHERE flight_group_id = '<group-id>';"
```

---

## Security Testing

### 1. Test Authentication

```bash
# Test without token (should fail with 401)
curl -X GET http://localhost:3000/api/groups

# Test with invalid token (should fail with 401)
curl -X GET http://localhost:3000/api/groups \
  -H "Authorization: Bearer invalid-token"

# Test with expired token (should fail with 401)
curl -X GET http://localhost:3000/api/groups \
  -H "Authorization: Bearer <expired-token>"
```

### 2. Test Authorization

```bash
# Login as Sub Agent
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "agencyCode": "XYZ456",
    "username": "agent",
    "password": "password123"
  }'

export AGENT_TOKEN="<agent-token>"

# Try to create group (should fail with 403)
curl -X POST http://localhost:3000/api/groups \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'

# Try to approve booking (should fail with 403)
curl -X POST http://localhost:3000/api/bookings/<id>/approve \
  -H "Authorization: Bearer $AGENT_TOKEN"
```

### 3. Test Rate Limiting

```bash
# Test login rate limiting (should block after 5 attempts)
for i in {1..10}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "agencyCode": "ABC123",
      "username": "admin",
      "password": "wrong-password"
    }'
  echo ""
done
```

### 4. Test Input Validation

```bash
# Test SQL injection prevention
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "agencyCode": "ABC123",
    "username": "admin\" OR \"1\"=\"1",
    "password": "anything"
  }'

# Test XSS prevention
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "flightGroupId": "<group-id>",
    "passengers": {"adults": 1, "children": 0, "infants": 0},
    "remarks": "<script>alert(\"XSS\")</script>"
  }'

# Test negative numbers
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "flightGroupId": "<group-id>",
    "passengers": {"adults": -1, "children": 0, "infants": 0}
  }'
```

---

**For questions or issues, refer to:**
- README.md
- PRD.md
- FIXES_APPLIED.md
