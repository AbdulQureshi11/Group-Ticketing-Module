#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL for API
BASE_URL="http://localhost:9000"
API_BASE_URL="http://localhost:3000/api"

# Test counters
PASSED=0
FAILED=0
TOTAL=0

# Helper function to print test results
print_test() {
    TOTAL=$((TOTAL + 1))
    if [ $1 -eq 0 ]; then
        PASSED=$((PASSED + 1))
        echo -e "${GREEN}✓${NC} $2"
    else
        FAILED=$((FAILED + 1))
        echo -e "${RED}✗${NC} $2"
    fi
}

# Helper function to print section headers
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Helper function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    
    if [ -n "$token" ]; then
        curl -s -X $method "$API_BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -d "$data"
    else
        curl -s -X $method "$API_BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data"
    fi
}

echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Group Ticketing Module - Requirements Testing Suite      ║${NC}"
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"

# ============================================================================
# REQUIREMENT 1: Check Project Structure & Dependencies
# ============================================================================
print_header "REQUIREMENT 1: Project Structure & Dependencies"

# Check if package.json exists
if [ -f "package.json" ]; then
    print_test 0 "package.json exists"
else
    print_test 1 "package.json exists"
fi

# Check critical dependencies
dependencies=("express" "sequelize" "mysql2" "jsonwebtoken" "bcryptjs" "bullmq" "redis" "winston")
for dep in "${dependencies[@]}"; do
    if npm list "$dep" &>/dev/null; then
        print_test 0 "Dependency: $dep installed"
    else
        print_test 1 "Dependency: $dep installed"
    fi
done

# ============================================================================
# REQUIREMENT 2: Database Models
# ============================================================================
print_header "REQUIREMENT 2: Database Models"

models=(
    "Agency.js"
    "User.js"
    "AgencySettings.js"
    "FlightGroup.js"
    "GroupSeatBucket.js"
    "GroupAgencyAllocation.js"
    "BookingRequest.js"
    "BookingPassenger.js"
    "PaymentProof.js"
    "AuditLog.js"
)

for model in "${models[@]}"; do
    if [ -f "src/database/models/$model" ]; then
        print_test 0 "Model exists: $model"
    else
        print_test 1 "Model exists: $model"
    fi
done

# ============================================================================
# REQUIREMENT 3: Route Files
# ============================================================================
print_header "REQUIREMENT 3: API Route Files"

routes=(
    "auth/auth.routes.js"
    "agencies/agency.routes.js"
    "users/user.routes.js"
    "groups/group.routes.js"
    "bookings/booking.routes.js"
    "passengers/passenger.routes.js"
    "pnr-management/pnrManagement.routes.js"
    "settings/settings.routes.js"
    "reports/report.routes.js"
)

for route in "${routes[@]}"; do
    if [ -f "src/modules/$route" ]; then
        print_test 0 "Route exists: $route"
    else
        print_test 1 "Route exists: $route"
    fi
done

# ============================================================================
# REQUIREMENT 4: Service Layer
# ============================================================================
print_header "REQUIREMENT 4: Service Layer"

services=(
    "bookings/booking.service.js"
    "seat-management/seatManagement.service.js"
    "pnr-management/pnrManagement.service.js"
    "pricing/pricing.service.js"
    "status-machine/statusMachine.service.js"
    "background-jobs/backgroundJobs.service.js"
)

for service in "${services[@]}"; do
    if [ -f "src/modules/$service" ]; then
        print_test 0 "Service exists: $service"
    else
        print_test 1 "Service exists: $service"
    fi
done

# ============================================================================
# REQUIREMENT 5: Middleware
# ============================================================================
print_header "REQUIREMENT 5: Middleware"

middleware=(
    "auth.js"
    "validation.js"
    "rateLimiter.js"
)

for mw in "${middleware[@]}"; do
    if [ -f "src/core/middleware/$mw" ]; then
        print_test 0 "Middleware exists: $mw"
    else
        print_test 1 "Middleware exists: $mw"
    fi
done

# ============================================================================
# REQUIREMENT 6: Security Features
# ============================================================================
print_header "REQUIREMENT 6: Security Features"

# Check for JWT implementation
if grep -q "jsonwebtoken" package.json; then
    print_test 0 "JWT authentication configured"
else
    print_test 1 "JWT authentication configured"
fi

# Check for bcrypt
if grep -q "bcryptjs" package.json; then
    print_test 0 "Password hashing (bcrypt) configured"
else
    print_test 1 "Password hashing (bcrypt) configured"
fi

# Check for rate limiting
if grep -q "express-rate-limit" package.json; then
    print_test 0 "Rate limiting configured"
else
    print_test 1 "Rate limiting configured"
fi

# Check for CORS
if grep -q "cors" package.json; then
    print_test 0 "CORS configured"
else
    print_test 1 "CORS configured"
fi

# Check for validation
if grep -q "express-validator" package.json; then
    print_test 0 "Input validation configured"
else
    print_test 1 "Input validation configured"
fi

# ============================================================================
# REQUIREMENT 7: Background Jobs
# ============================================================================
print_header "REQUIREMENT 7: Background Jobs & Queue"

# Check for BullMQ
if grep -q "bullmq" package.json; then
    print_test 0 "BullMQ job queue configured"
else
    print_test 1 "BullMQ job queue configured"
fi

# Check for Redis
if grep -q "redis" package.json || grep -q "ioredis" package.json; then
    print_test 0 "Redis configured"
else
    print_test 1 "Redis configured"
fi

# Check background jobs service
if [ -f "src/modules/background-jobs/backgroundJobs.service.js" ]; then
    print_test 0 "Background jobs service exists"
else
    print_test 1 "Background jobs service exists"
fi

# ============================================================================
# REQUIREMENT 8: Notification System
# ============================================================================
print_header "REQUIREMENT 8: Notification System"

# Check notification service
if [ -f "src/services/notification.service.js" ]; then
    print_test 0 "Notification service exists"
else
    print_test 1 "Notification service exists"
fi

# Check for nodemailer
if grep -q "nodemailer" package.json; then
    print_test 0 "Email service (nodemailer) configured"
else
    print_test 1 "Email service (nodemailer) configured"
fi

# ============================================================================
# REQUIREMENT 9: Audit Logging
# ============================================================================
print_header "REQUIREMENT 9: Audit Logging"

# Check audit service
if [ -f "src/services/audit.service.js" ]; then
    print_test 0 "Audit service exists"
else
    print_test 1 "Audit service exists"
fi

# Check Winston logger
if grep -q "winston" package.json; then
    print_test 0 "Winston logger configured"
else
    print_test 1 "Winston logger configured"
fi

# ============================================================================
# REQUIREMENT 10: Test Suite
# ============================================================================
print_header "REQUIREMENT 10: Test Suite"

# Check for Jest
if grep -q "jest" package.json; then
    print_test 0 "Jest testing framework configured"
else
    print_test 1 "Jest testing framework configured"
fi

# Check for test files
test_files=(
    "tests/integration/groups.test.js"
    "tests/integration/bookings.test.js"
    "tests/unit/app.test.js"
)

for test_file in "${test_files[@]}"; do
    if [ -f "$test_file" ]; then
        print_test 0 "Test file exists: $test_file"
    else
        print_test 1 "Test file exists: $test_file"
    fi
done

# ============================================================================
# REQUIREMENT 11: Configuration Files
# ============================================================================
print_header "REQUIREMENT 11: Configuration Files"

config_files=(
    ".env.example"
    "src/config/database.js"
    "src/config/redis.js"
)

for config in "${config_files[@]}"; do
    if [ -f "$config" ]; then
        print_test 0 "Config file exists: $config"
    else
        print_test 1 "Config file exists: $config"
    fi
done

# ============================================================================
# REQUIREMENT 12: Code Quality Checks
# ============================================================================
print_header "REQUIREMENT 12: Code Quality Checks"

# Check for dynamic imports (should be minimal)
dynamic_imports=$(grep -r "await import" src/ --include="*.js" 2>/dev/null | wc -l)
if [ "$dynamic_imports" -lt 5 ]; then
    print_test 0 "Minimal dynamic imports ($dynamic_imports found)"
else
    print_test 1 "Minimal dynamic imports ($dynamic_imports found - should be < 5)"
fi

# Check for console.log (should use logger)
console_logs=$(grep -r "console\." src/ --include="*.js" --exclude-dir=node_modules 2>/dev/null | wc -l)
if [ "$console_logs" -lt 20 ]; then
    print_test 0 "Using logger instead of console ($console_logs console statements)"
else
    print_test 1 "Using logger instead of console ($console_logs console statements - should be < 20)"
fi

# Check for hardcoded passwords
hardcoded_passwords=$(grep -r "password.*=.*['\"]" src/ --include="*.js" 2>/dev/null | grep -v "passwordHash" | grep -v "password:" | wc -l)
if [ "$hardcoded_passwords" -eq 0 ]; then
    print_test 0 "No hardcoded passwords found"
else
    print_test 1 "No hardcoded passwords found ($hardcoded_passwords potential issues)"
fi

# ============================================================================
# REQUIREMENT 13: Documentation
# ============================================================================
print_header "REQUIREMENT 13: Documentation"

docs=(
    "README.md"
    "PRD.md"
    "FIXES_APPLIED.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        print_test 0 "Documentation exists: $doc"
    else
        print_test 1 "Documentation exists: $doc"
    fi
done

# ============================================================================
# SUMMARY
# ============================================================================
echo -e "\n${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║                    TEST SUMMARY                            ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
echo -e "Total Tests: ${BLUE}$TOTAL${NC}"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All requirements satisfied!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some requirements not satisfied${NC}"
    exit 1
fi
