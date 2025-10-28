# API Testing Guide for Flight Group Ticketing System

This guide provides comprehensive API endpoints and sample data for testing the Flight Group Ticketing API using Insomnia, Postman, or any HTTP client.

## 🚀 Quick Start

### 1. Environment Setup
Ensure your `.env` file is configured with:
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=flight_group_db
JWT_SECRET=your-super-secret-jwt-key
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 2. Start the Server
```bash
npm run dev
```
Server will run on `http://localhost:3000`

### 3. Base URL
```
http://localhost:3000
```

---

## 🔐 Authentication

All endpoints except `/auth/login` require authentication. Include the JWT token in headers:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Login
**POST** `/auth/login`
```json
{
  "agencyCode": "DEMO_AGENCY",
  "username": "admin",
  "password": "password123"
}
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "refresh_token_here",
    "user": {
      "id": "uuid-here",
      "username": "admin",
      "role": "ADMIN",
      "agencyId": "agency-uuid",
      "agencyCode": "DEMO_AGENCY"
    }
  }
}
```

### Refresh Token
**POST** `/auth/refresh`
```json
{
  "refreshToken": "your_refresh_token_here"
}
```

---

## 🏥 Health Check

### Health Status
**GET** `/health`

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-10-28T13:35:00.000Z",
    "version": "2.0.0",
    "environment": "development"
  }
}
```

---

## 🏢 Agency Management

### Create Agency
**POST** `/agencies`
```json
{
  "name": "Demo Travel Agency",
  "code": "DEMO_AGENCY",
  "parentAgencyId": null,
  "status": "ACTIVE"
}
```

### Get Agency Details
**GET** `/agencies/{agencyId}`

---

## 👥 User Management

### Create User
**POST** `/users`
```json
{
  "agencyId": "agency-uuid-here",
  "username": "agent1",
  "passwordHash": "$2a$10$hashedpasswordhere",
  "email": "agent1@demoagency.com",
  "phone": "+1234567890",
  "role": "AGENT"
}
```

### List Users
**GET** `/users`

### Get User Details
**GET** `/users/{userId}`

### Update User
**PATCH** `/users/{userId}`
```json
{
  "email": "newemail@demoagency.com",
  "phone": "+1987654321"
}
```

---

## ✈️ Flight Groups

### Create Flight Group
**POST** `/groups`
```json
{
  "agencyId": "agency-uuid-here",
  "carrierCode": "PK",
  "flightNumber": "301",
  "origin": "ISB",
  "destination": "LHR",
  "departureTimeUtc": "2025-12-01T10:00:00Z",
  "arrivalTimeUtc": "2025-12-01T18:00:00Z",
  "aircraftType": "Boeing 777",
  "totalSeats": 300,
  "availableSeats": 300,
  "baseFare": 85000,
  "currency": "PKR",
  "status": "ACTIVE"
}
```

### List Groups
**GET** `/groups`

### Get Group Details
**GET** `/groups/{groupId}`

### Allocate Seats
**POST** `/groups/{groupId}/allocations`
```json
{
  "agencyId": "agency-uuid-here",
  "adults": 10,
  "children": 5,
  "infants": 2
}
```

---

## 🎫 Booking Management

### Create Booking
**POST** `/bookings`
```json
{
  "flightGroupId": "group-uuid-here",
  "requestingAgencyId": "agency-uuid-here",
  "paxAdults": 2,
  "paxChildren": 1,
  "paxInfants": 0,
  "contactName": "John Doe",
  "contactEmail": "john@example.com",
  "contactPhone": "+1234567890",
  "specialRequests": "Window seats preferred"
}
```

### List Bookings
**GET** `/bookings`

### Get Booking Details
**GET** `/bookings/{bookingId}`

### Approve Booking
**POST** `/bookings/{bookingId}/approve`

### Reject Booking
**POST** `/bookings/{bookingId}/reject`
```json
{
  "rejectionReason": "Flight fully booked"
}
```

### Upload Payment Proof
**POST** `/bookings/{bookingId}/payment-proof`
```json
{
  "fileUrl": "https://example.com/payment-proof.jpg",
  "bankName": "Demo Bank",
  "amount": 255000,
  "currency": "PKR",
  "referenceNo": "REF123456"
}
```

### Mark Booking as Paid
**POST** `/bookings/{bookingId}/mark-paid`
```json
{
  "paymentReference": "TXN789012"
}
```

### Issue Tickets
**POST** `/bookings/{bookingId}/issue`

### Cancel Booking
**POST** `/bookings/{bookingId}/cancel`

---

## 👤 Passenger Management

### Add Passengers to Booking
**POST** `/passengers/bookings/{bookingId}`
```json
{
  "passengers": [
    {
      "firstName": "John",
      "lastName": "Doe",
      "paxType": "ADT",
      "dateOfBirth": "1990-05-15",
      "gender": "M",
      "nationality": "US",
      "passportNumber": "P1234567",
      "passportExpiry": "2030-05-15",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    {
      "firstName": "Jane",
      "lastName": "Doe",
      "paxType": "ADT",
      "dateOfBirth": "1992-08-20",
      "gender": "F",
      "nationality": "US",
      "passportNumber": "P7654321",
      "passportExpiry": "2032-08-20",
      "email": "jane@example.com",
      "phone": "+1234567890"
    },
    {
      "firstName": "Junior",
      "lastName": "Doe",
      "paxType": "CHD",
      "dateOfBirth": "2015-03-10",
      "gender": "M",
      "nationality": "US",
      "passportNumber": "P9999999",
      "passportExpiry": "2028-03-10"
    }
  ]
}
```

### Get Booking Passengers
**GET** `/passengers/bookings/{bookingId}`

### Update Passenger Details
**PATCH** `/passengers/{passengerId}`
```json
{
  "pnr": "ABC123",
  "ticketNo": "1234567890"
}
```

---

## 💰 Pricing

### Calculate Booking Price
**POST** `/pricing/calculate`
```json
{
  "flightGroupId": "group-uuid-here",
  "passengers": {
    "adults": 2,
    "children": 1,
    "infants": 0
  }
}
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "flightGroupId": "group-uuid-here",
    "passengers": {
      "adults": 2,
      "children": 1,
      "infants": 0
    },
    "pricing": {
      "currency": "PKR",
      "baseFare": 85000,
      "breakdown": {
        "adults": {
          "count": 2,
          "unitPrice": 85000,
          "total": 170000
        },
        "children": {
          "count": 1,
          "unitPrice": 63750,
          "total": 63750
        },
        "infants": {
          "count": 0,
          "unitPrice": 8500,
          "total": 0
        }
      },
      "totals": {
        "subtotal": 233750,
        "taxes": 21250,
        "totalFare": 255000
      }
    }
  }
}
```

### Get Flight Group Pricing
**GET** `/pricing/flight-groups/{groupId}`

---

## ⚙️ Settings

### Get Agency Settings
**GET** `/settings/agency`

### Update Agency Settings
**PATCH** `/settings/agency`
```json
{
  "commissionRate": 5.5,
  "paymentTerms": "Net 30 days",
  "contactEmail": "admin@demoagency.com",
  "contactPhone": "+1234567890"
}
```

---

## 🔄 Status Machine

### Get Status History
**GET** `/status-machine/history/{bookingId}`

### Get Available Transitions
**GET** `/status-machine/transitions/{bookingId}`

### Transition Booking Status
**POST** `/status-machine/transition/{bookingId}`
```json
{
  "newStatus": "APPROVED",
  "notes": "Approved by manager"
}
```

---

## 📊 Reports

### Groups Summary Report
**GET** `/reports/groups`

### Bookings Summary Report
**GET** `/reports/bookings`

### Sales Performance Report
**GET** `/reports/sales`

---

## 🎯 Seat Management

### Check Seat Availability
**GET** `/seat-management/availability/{groupId}`

### Allocate Seats
**POST** `/seat-management/allocate`
```json
{
  "flightGroupId": "group-uuid-here",
  "agencyId": "agency-uuid-here",
  "passengers": {
    "adults": 5,
    "children": 2,
    "infants": 1
  }
}
```

---

## 🎫 PNR Management

### Validate PNR
**GET** `/pnr/validate/{pnr}`

### Generate PNR
**POST** `/pnr/generate`

---

## ⚙️ Background Jobs (Admin Only)

### Get Job Statistics
**GET** `/jobs/stats`

### Send Email Job
**POST** `/jobs/email/send`
```json
{
  "to": "recipient@example.com",
  "subject": "Test Email",
  "template": "test-template",
  "data": {
    "message": "This is a test email"
  }
}
```

### Send Notification Job
**POST** `/jobs/notification/send`
```json
{
  "type": "SMS",
  "to": "+1234567890",
  "message": "Test notification"
}
```

---

## 🧪 Testing Workflow

### 1. Setup Test Data
1. Create an agency (POST `/agencies`)
2. Create a user (POST `/users`)
3. Create a flight group (POST `/groups`)
4. Login to get JWT token (POST `/auth/login`)

### 2. Complete Booking Flow
1. Create booking (POST `/bookings`)
2. Add passengers (POST `/passengers/bookings/{id}`)
3. Approve booking (POST `/bookings/{id}/approve`)
4. Upload payment proof (POST `/bookings/{id}/payment-proof`)
5. Mark as paid (POST `/bookings/{id}/mark-paid`)
6. Issue tickets (POST `/bookings/{id}/issue`)

### 3. Test Error Scenarios
- Try accessing resources without authentication
- Test with invalid data
- Test role-based access control
- Test status transition validation

---

## 📋 Sample Test Data

### Agencies
```json
{
  "name": "Demo Travel Agency",
  "code": "DEMO_AGENCY",
  "status": "ACTIVE"
}
```

### Users
```json
{
  "agencyId": "agency-uuid",
  "username": "demo_admin",
  "passwordHash": "$2a$10$example.hashed.password",
  "email": "admin@demoagency.com",
  "role": "ADMIN",
  "isActive": true
}
```

### Flight Groups
```json
{
  "agencyId": "agency-uuid",
  "carrierCode": "PK",
  "flightNumber": "301",
  "origin": "ISB",
  "destination": "LHR",
  "departureTimeUtc": "2025-12-01T10:00:00Z",
  "arrivalTimeUtc": "2025-12-01T18:00:00Z",
  "aircraftType": "Boeing 777",
  "totalSeats": 300,
  "baseFare": 85000,
  "currency": "PKR",
  "status": "ACTIVE"
}
```

### Bookings
```json
{
  "flightGroupId": "group-uuid",
  "requestingAgencyId": "agency-uuid",
  "paxAdults": 2,
  "paxChildren": 1,
  "paxInfants": 0,
  "contactName": "John Smith",
  "contactEmail": "john@example.com",
  "contactPhone": "+1234567890"
}
```

---

## 🔧 Common Issues & Solutions

### Authentication Errors
- Ensure JWT token is valid and not expired
- Check that `Authorization: Bearer <token>` header is set correctly

### Permission Errors
- Verify user role matches endpoint requirements
- Check agency access for resource-specific endpoints

### Database Errors
- Ensure database is running and accessible
- Check `.env` configuration matches your database setup

### Validation Errors
- Review request payload against API documentation
- Ensure all required fields are provided
- Check data types and formats

---

## 📞 Support

For issues with the API:
1. Check the server logs in `logs/` directory
2. Verify your `.env` configuration
3. Test with the health check endpoint: `GET /health`
4. Review error messages for specific guidance

Happy testing! 🚀
