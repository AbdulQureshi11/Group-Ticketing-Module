# API Reference - Flight Group Booking API

Complete API endpoint reference with examples.

## Base URL

```
http://localhost:3000
```

## Authentication

All endpoints except `/auth/login` and `/health` require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Authentication Endpoints

### Login

Authenticate user and receive JWT tokens.

**Endpoint:** `POST /auth/login`  
**Access:** Public

**Request:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "agencyCode": "ABC123",
    "username": "admin",
    "password": "Password@123$"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "a5471f92-c95e-4d7d-914b-b9ad675e8b11",
      "username": "admin",
      "role": "ADMIN",
      "agencyId": "a6d8d03a-32fd-4bfa-9350-c260b3867be0",
      "agencyCode": "ABC123",
      "agencyName": "ABC Travel Services",
      "email": "admin@abc-travel.com",
      "phone": "+92-21-1234567"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Refresh Token

Get a new access token using refresh token.

**Endpoint:** `POST /auth/refresh`  
**Access:** Authenticated

**Request:**
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your-refresh-token"
  }'
```

### Logout

Invalidate current session.

**Endpoint:** `POST /auth/logout`  
**Access:** Authenticated

**Request:**
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer <token>"
```

---

## 🏢 Agency Endpoints

### Get Agency Details

**Endpoint:** `GET /agencies/:id`  
**Access:** Agency users  
**Role:** Any authenticated user from the agency

**Request:**
```bash
curl -X GET http://localhost:3000/agencies/a6d8d03a-32fd-4bfa-9350-c260b3867be0 \
  -H "Authorization: Bearer <token>"
```

### Create Agency

**Endpoint:** `POST /agencies`  
**Access:** Admin only

**Request:**
```bash
curl -X POST http://localhost:3000/agencies \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "NEW123",
    "name": "New Travel Agency",
    "contactEmail": "contact@newagency.com",
    "contactPhone": "+92-21-9999999",
    "address": "123 New Street",
    "city": "Karachi",
    "country": "Pakistan",
    "status": "ACTIVE"
  }'
```

---

## 👥 User Endpoints

### Create User

**Endpoint:** `POST /users`  
**Access:** Admin only

**Request:**
```bash
curl -X POST http://localhost:3000/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newagent",
    "password": "Agent@123$",
    "role": "SUB_AGENT",
    "email": "agent@example.com",
    "phone": "+92-21-1234567"
  }'
```

### Update User

**Endpoint:** `PATCH /users/:id`  
**Access:** Admin only

**Request:**
```bash
curl -X PATCH http://localhost:3000/users/<user-id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newemail@example.com",
    "phone": "+92-21-9999999",
    "isActive": 1
  }'
```

---

## ✈️ Flight Group Endpoints

### List Flight Groups

**Endpoint:** `GET /groups`  
**Access:** Authenticated (agency filtered)

**Request:**
```bash
# List all groups for your agency
curl -X GET http://localhost:3000/groups \
  -H "Authorization: Bearer <token>"

# With filters
curl -X GET "http://localhost:3000/groups?status=OPEN&limit=10" \
  -H "Authorization: Bearer <token>"
```

**Query Parameters:**
- `status` - Filter by status (DRAFT, OPEN, CLOSED, CANCELLED)
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset

### Get Flight Group Details

**Endpoint:** `GET /groups/:id`  
**Access:** Agency users

**Request:**
```bash
curl -X GET http://localhost:3000/groups/<group-id> \
  -H "Authorization: Bearer <token>"
```

### Create Flight Group

**Endpoint:** `POST /groups`  
**Access:** Admin/Manager

**Request:**
```bash
curl -X POST http://localhost:3000/groups \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "flightNumber": "PK307",
    "carrierCode": "PK",
    "origin": "KHI",
    "destination": "LHE",
    "route": "KHI-LHE",
    "departureTimeUtc": "2025-11-15T10:00:00Z",
    "arrivalTimeUtc": "2025-11-15T12:00:00Z",
    "departureTimeLocal": "2025-11-15T15:00:00+05:00",
    "arrivalTimeLocal": "2025-11-15T17:00:00+05:00",
    "totalSeats": 50,
    "basePrice": 15000.00,
    "currency": "PKR",
    "salesStart": "2025-10-01T00:00:00Z",
    "salesEnd": "2025-11-14T23:59:59Z",
    "status": "OPEN"
  }'
```

### Update Flight Group

**Endpoint:** `PATCH /groups/:id`  
**Access:** Admin/Manager

**Request:**
```bash
curl -X PATCH http://localhost:3000/groups/<group-id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CLOSED",
    "basePrice": 16000.00
  }'
```

---

## 🎫 Booking Endpoints

### List Bookings

**Endpoint:** `GET /bookings`  
**Access:** Authenticated (agency filtered)

**Request:**
```bash
# List all bookings
curl -X GET http://localhost:3000/bookings \
  -H "Authorization: Bearer <token>"

# With filters
curl -X GET "http://localhost:3000/bookings?status=APPROVED&limit=20" \
  -H "Authorization: Bearer <token>"
```

### Get Booking Details

**Endpoint:** `GET /bookings/:id`  
**Access:** Agency users

**Request:**
```bash
curl -X GET http://localhost:3000/bookings/<booking-id> \
  -H "Authorization: Bearer <token>"
```

### Create Booking

**Endpoint:** `POST /bookings`  
**Access:** Authenticated

**Request:**
```bash
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "flightGroupId": "<group-id>",
    "numberOfSeats": 2,
    "contactName": "John Doe",
    "contactEmail": "john@example.com",
    "contactPhone": "+92-300-1234567",
    "passengers": [
      {
        "firstName": "John",
        "lastName": "Doe",
        "dateOfBirth": "1990-01-01",
        "passportNumber": "AB1234567",
        "nationality": "Pakistani"
      },
      {
        "firstName": "Jane",
        "lastName": "Doe",
        "dateOfBirth": "1992-05-15",
        "passportNumber": "AB7654321",
        "nationality": "Pakistani"
      }
    ]
  }'
```

### Approve Booking

**Endpoint:** `POST /bookings/:id/approve`  
**Access:** Admin/Manager

**Request:**
```bash
curl -X POST http://localhost:3000/bookings/<booking-id>/approve \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Approved after verification"
  }'
```

### Reject Booking

**Endpoint:** `POST /bookings/:id/reject`  
**Access:** Admin/Manager

**Request:**
```bash
curl -X POST http://localhost:3000/bookings/<booking-id>/reject \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Insufficient documentation"
  }'
```

### Upload Payment Proof

**Endpoint:** `POST /bookings/:id/payment-proof`  
**Access:** Agency users

**Request:**
```bash
curl -X POST http://localhost:3000/bookings/<booking-id>/payment-proof \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/payment-receipt.pdf" \
  -F "paymentMethod=Bank Transfer" \
  -F "amount=30000"
```

### Mark as Paid

**Endpoint:** `POST /bookings/:id/mark-paid`  
**Access:** Admin/Manager

**Request:**
```bash
curl -X POST http://localhost:3000/bookings/<booking-id>/mark-paid \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "Bank Transfer",
    "transactionId": "TXN123456789"
  }'
```

### Issue Tickets

**Endpoint:** `POST /bookings/:id/issue`  
**Access:** Admin/Manager

**Request:**
```bash
curl -X POST http://localhost:3000/bookings/<booking-id>/issue \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "pnr": "ABC123",
    "ticketNumbers": ["1234567890", "0987654321"]
  }'
```

### Cancel Booking

**Endpoint:** `POST /bookings/:id/cancel`  
**Access:** Agency users

**Request:**
```bash
curl -X POST http://localhost:3000/bookings/<booking-id>/cancel \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Customer request"
  }'
```

---

## 💰 Pricing Endpoints

### Get Flight Group Pricing

**Endpoint:** `GET /pricing/flight-groups/:id`  
**Access:** Authenticated

**Request:**
```bash
curl -X GET http://localhost:3000/pricing/flight-groups/<group-id> \
  -H "Authorization: Bearer <token>"
```

### Calculate Booking Price

**Endpoint:** `POST /pricing/calculate`  
**Access:** Authenticated

**Request:**
```bash
curl -X POST http://localhost:3000/pricing/calculate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "flightGroupId": "<group-id>",
    "numberOfSeats": 2
  }'
```

---

## ⚙️ Settings Endpoints

### Get Agency Settings

**Endpoint:** `GET /settings/agency`  
**Access:** Agency users

**Request:**
```bash
curl -X GET http://localhost:3000/settings/agency \
  -H "Authorization: Bearer <token>"
```

### Update Agency Settings

**Endpoint:** `PATCH /settings/agency`  
**Access:** Admin/Manager

**Request:**
```bash
curl -X PATCH http://localhost:3000/settings/agency \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "maxBookingsPerDay": 100,
    "autoApprovalEnabled": true,
    "notificationEnabled": true
  }'
```

---

## 📊 Report Endpoints

### Groups Report

**Endpoint:** `GET /reports/groups`  
**Access:** Admin/Manager

**Request:**
```bash
curl -X GET "http://localhost:3000/reports/groups?format=json" \
  -H "Authorization: Bearer <token>"
```

**Query Parameters:**
- `format` - Response format (json, csv)
- `startDate` - Filter from date
- `endDate` - Filter to date

### Bookings Report

**Endpoint:** `GET /reports/bookings`  
**Access:** Admin/Manager

**Request:**
```bash
curl -X GET "http://localhost:3000/reports/bookings?status=ISSUED&format=csv" \
  -H "Authorization: Bearer <token>"
```

### Sales Report

**Endpoint:** `GET /reports/sales`  
**Access:** Admin/Manager

**Request:**
```bash
curl -X GET "http://localhost:3000/reports/sales?period=monthly" \
  -H "Authorization: Bearer <token>"
```

---

## 🎯 Seat Management Endpoints

### Check Seat Availability

**Endpoint:** `GET /seat-management/availability/:groupId`  
**Access:** Authenticated

**Request:**
```bash
curl -X GET http://localhost:3000/seat-management/availability/<group-id> \
  -H "Authorization: Bearer <token>"
```

### Allocate Seats

**Endpoint:** `POST /seat-management/allocate`  
**Access:** Agency users

**Request:**
```bash
curl -X POST http://localhost:3000/seat-management/allocate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "flightGroupId": "<group-id>",
    "numberOfSeats": 5,
    "bookingId": "<booking-id>"
  }'
```

---

## 🎫 PNR Management Endpoints

### Validate PNR

**Endpoint:** `GET /pnr/validate/:pnr`  
**Access:** Authenticated

**Request:**
```bash
curl -X GET http://localhost:3000/pnr/validate/ABC123 \
  -H "Authorization: Bearer <token>"
```

### Get Booking by PNR

**Endpoint:** `GET /pnr/booking/:bookingId`  
**Access:** Authenticated

**Request:**
```bash
curl -X GET http://localhost:3000/pnr/booking/<booking-id> \
  -H "Authorization: Bearer <token>"
```

---

## 🏥 Health Check

### Health Check

**Endpoint:** `GET /health`  
**Access:** Public

**Request:**
```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "ok": true
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "success": false,
  "message": "Error description",
  "data": {
    "details": "Additional error information"
  }
}
```

### Validation Error Format

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

**Development:** 1000 requests per 15 minutes per IP  
**Production:** 100 requests per 15 minutes per IP

When rate limit is exceeded:
```json
{
  "success": false,
  "message": "Too many requests, please try again later."
}
```

---

## Testing Tips

### Save token for reuse

```bash
# Login and save token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"agencyCode":"ABC123","username":"admin","password":"Password@123$"}' \
  | jq -r '.data.accessToken')

# Use token in subsequent requests
curl -X GET http://localhost:3000/groups \
  -H "Authorization: Bearer $TOKEN"
```

### Pretty print JSON responses

```bash
curl http://localhost:3000/health | jq '.'
```

### Test with Postman/Insomnia

1. Import the API collection
2. Set environment variable `base_url` = `http://localhost:3000`
3. Set environment variable `token` from login response
4. Use `{{base_url}}` and `{{token}}` in requests

---

For more information, see [README.md](README.md) and [SETUP.md](SETUP.md).
