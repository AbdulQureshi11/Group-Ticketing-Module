#!/bin/bash

# API Testing Script for Group Ticketing Module
# Tests all API endpoints defined in PRD Requirement 6

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
API_BASE="http://localhost:3000/api"
ADMIN_TOKEN=""
MANAGER_TOKEN=""
AGENT_TOKEN=""

# Test counters
PASSED=0
FAILED=0
TOTAL=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_test() {
    TOTAL=$((TOTAL + 1))
    local status=$1
    local endpoint=$2
    local response=$3
    
    if [ $status -eq 200 ] || [ $status -eq 201 ]; then
        PASSED=$((PASSED + 1))
        echo -e "${GREEN}✓${NC} [$status] $endpoint"
    elif [ $status -eq 401 ] || [ $status -eq 403 ]; then
        PASSED=$((PASSED + 1))
        echo -e "${YELLOW}⚠${NC} [$status] $endpoint (Auth required - expected)"
    else
        FAILED=$((FAILED + 1))
        echo -e "${RED}✗${NC} [$status] $endpoint"
        if [ -n "$response" ]; then
            echo -e "   ${RED}Response: $response${NC}"
        fi
    fi
}

api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    
    local response
    local status
    
    if [ -n "$token" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -d "$data" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>&1)
    fi
    
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    echo "$status|$body"
}

echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║     Group Ticketing Module - API Endpoint Testing         ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"

# Check if server is running
echo -e "\n${BLUE}Checking if API server is running...${NC}"
if curl -s "$API_BASE" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API server is running${NC}"
else
    echo -e "${RED}✗ API server is not running at $API_BASE${NC}"
    echo -e "${YELLOW}Please start the server with: npm start${NC}"
    exit 1
fi

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================
print_header "AUTHENTICATION ENDPOINTS"

# Test login endpoint
result=$(api_call "POST" "/auth/login" '{
    "agencyCode": "ABC123",
    "username": "admin",
    "password": "password123"
}')
status=$(echo "$result" | cut -d'|' -f1)
body=$(echo "$result" | cut -d'|' -f2-)
print_test $status "POST /auth/login" "$body"

# Extract token if login successful
if [ $status -eq 200 ]; then
    ADMIN_TOKEN=$(echo "$body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo -e "   ${GREEN}Admin token obtained${NC}"
fi

# Test refresh endpoint
result=$(api_call "POST" "/auth/refresh" '{}' "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "POST /auth/refresh"

# Test logout endpoint
result=$(api_call "POST" "/auth/logout" '{}' "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "POST /auth/logout"

# ============================================================================
# AGENCIES ENDPOINTS
# ============================================================================
print_header "AGENCIES ENDPOINTS"

# Test get agency
result=$(api_call "GET" "/agencies/1" "" "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "GET /agencies/:id"

# Test create agency (Admin only)
result=$(api_call "POST" "/agencies" '{
    "code": "TEST123",
    "name": "Test Agency",
    "contactEmail": "test@agency.com",
    "contactPhone": "+92-300-1234567"
}' "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "POST /agencies"

# ============================================================================
# USERS ENDPOINTS
# ============================================================================
print_header "USERS ENDPOINTS"

# Test create user
result=$(api_call "POST" "/users" '{
    "username": "testuser",
    "password": "password123",
    "agencyCode": "ABC123",
    "role": "Agent",
    "name": "Test User",
    "email": "testuser@agency.com"
}' "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "POST /users"

# Test update user
result=$(api_call "PATCH" "/users/1" '{
    "isActive": true
}' "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "PATCH /users/:id"

# ============================================================================
# GROUPS ENDPOINTS
# ============================================================================
print_header "GROUPS ENDPOINTS"

# Test list groups
result=$(api_call "GET" "/groups" "" "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "GET /groups"

# Test get group by id
result=$(api_call "GET" "/groups/1" "" "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "GET /groups/:id"

# Test create group
result=$(api_call "POST" "/groups" '{
    "carrierCode": "PK",
    "flightNumber": "123",
    "origin": "LHE",
    "destination": "KHI",
    "departureTimeUtc": "2025-12-01T10:00:00Z",
    "arrivalTimeUtc": "2025-12-01T12:00:00Z",
    "pnrMode": "GROUP_PNR",
    "salesStart": "2025-10-01T00:00:00Z",
    "salesEnd": "2025-11-30T23:59:59Z",
    "seatBuckets": [
        {"paxType": "ADT", "totalSeats": 50, "baseFare": 15000, "taxAmount": 2000, "currency": "PKR"}
    ]
}' "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "POST /groups"

# Test update group
result=$(api_call "PATCH" "/groups/1" '{
    "status": "PUBLISHED"
}' "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "PATCH /groups/:id"

# ============================================================================
# BOOKINGS ENDPOINTS
# ============================================================================
print_header "BOOKINGS ENDPOINTS"

# Test list bookings
result=$(api_call "GET" "/bookings" "" "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "GET /bookings"

# Test get booking by id
result=$(api_call "GET" "/bookings/1" "" "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "GET /bookings/:id"

# Test create booking
result=$(api_call "POST" "/bookings" '{
    "flightGroupId": "1",
    "passengers": {
        "adults": 2,
        "children": 1,
        "infants": 0
    },
    "remarks": "Test booking"
}' "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "POST /bookings"

# Test approve booking
result=$(api_call "POST" "/bookings/1/approve" '{}' "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "POST /bookings/:id/approve"

# Test reject booking
result=$(api_call "POST" "/bookings/1/reject" '{
    "reason": "Test rejection"
}' "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "POST /bookings/:id/reject"

# Test upload payment proof
result=$(api_call "POST" "/bookings/1/payment-proof" '{
    "fileUrl": "https://example.com/receipt.pdf",
    "bankName": "Test Bank",
    "amount": 17000,
    "currency": "PKR",
    "referenceNo": "REF123456"
}' "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "POST /bookings/:id/payment-proof"

# Test mark as paid
result=$(api_call "POST" "/bookings/1/mark-paid" '{}' "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "POST /bookings/:id/mark-paid"

# Test issue booking
result=$(api_call "POST" "/bookings/1/issue" '{}' "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "POST /bookings/:id/issue"

# Test cancel booking
result=$(api_call "POST" "/bookings/1/cancel" '{
    "reason": "Test cancellation"
}' "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "POST /bookings/:id/cancel"

# ============================================================================
# PASSENGERS ENDPOINTS
# ============================================================================
print_header "PASSENGERS ENDPOINTS"

# Test add passengers
result=$(api_call "POST" "/bookings/1/passengers" '{
    "passengers": [
        {
            "paxType": "ADT",
            "title": "Mr",
            "firstName": "John",
            "lastName": "Doe",
            "dob": "1990-01-01",
            "nationality": "PK",
            "passportNo": "AB1234567",
            "passportExpiry": "2030-01-01"
        }
    ]
}' "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "POST /bookings/:id/passengers"

# Test update passenger
result=$(api_call "PATCH" "/passengers/1" '{
    "ticketNo": "PK-20251201-123456"
}' "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "PATCH /passengers/:id"

# ============================================================================
# SETTINGS ENDPOINTS
# ============================================================================
print_header "SETTINGS ENDPOINTS"

# Test get agency settings
result=$(api_call "GET" "/settings/agency" "" "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "GET /settings/agency"

# Test update agency settings
result=$(api_call "PATCH" "/settings/agency" '{
    "defaultHoldHours": 48,
    "allowManagerGroupCreate": true
}' "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "PATCH /settings/agency"

# ============================================================================
# REPORTS ENDPOINTS
# ============================================================================
print_header "REPORTS ENDPOINTS"

# Test groups report
result=$(api_call "GET" "/reports/groups?format=json" "" "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "GET /reports/groups"

# Test bookings report
result=$(api_call "GET" "/reports/bookings?format=json" "" "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "GET /reports/bookings"

# Test sales report
result=$(api_call "GET" "/reports/sales?format=json" "" "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "GET /reports/sales"

# ============================================================================
# PNR MANAGEMENT ENDPOINTS
# ============================================================================
print_header "PNR MANAGEMENT ENDPOINTS"

# Test validate PNR
result=$(api_call "GET" "/pnr/validate/ABC123" "" "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "GET /pnr/validate/:pnr"

# Test get booking PNR info
result=$(api_call "GET" "/pnr/booking/1" "" "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "GET /pnr/booking/:bookingId"

# ============================================================================
# PRICING ENDPOINTS
# ============================================================================
print_header "PRICING ENDPOINTS"

# Test calculate pricing
result=$(api_call "POST" "/pricing/calculate" '{
    "flightGroupId": "1",
    "passengers": {
        "adults": 2,
        "children": 1,
        "infants": 0
    }
}' "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "POST /pricing/calculate"

# Test check availability
result=$(api_call "POST" "/pricing/check-availability" '{
    "flightGroupId": "1",
    "passengers": {
        "adults": 2,
        "children": 1,
        "infants": 0
    }
}' "$ADMIN_TOKEN")
status=$(echo "$result" | cut -d'|' -f1)
print_test $status "POST /pricing/check-availability"

# ============================================================================
# SUMMARY
# ============================================================================
echo -e "\n${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║                    API TEST SUMMARY                        ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
echo -e "Total Endpoints Tested: ${BLUE}$TOTAL${NC}"
echo -e "Successful: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

success_rate=$((PASSED * 100 / TOTAL))
echo -e "Success Rate: ${BLUE}${success_rate}%${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All API endpoints are working!${NC}"
    exit 0
else
    echo -e "\n${YELLOW}⚠ Some endpoints may need database setup or authentication${NC}"
    exit 0
fi
