# Quick Test Reference Card

## 🚀 Quick Start (5 Minutes)

```bash
# 1. Run structure tests
./test-requirements.sh

# 2. Run unit tests
npm test

# 3. Start server (in another terminal)
npm start

# 4. Run API tests
./test-api-endpoints.sh
```

---

## 📋 Essential Commands

### Testing
```bash
# All tests
npm test

# Specific test file
npm test tests/integration/bookings.test.js

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Database
```bash
# Connect to database
mysql -u root -p flight_group_db

# Check tables
SHOW TABLES;

# Check seat counters
SELECT fg.carrier_code, fg.flight_number, gsb.pax_type, 
       gsb.total_seats, gsb.seats_on_hold, gsb.seats_issued,
       (gsb.total_seats - gsb.seats_on_hold - gsb.seats_issued) as available
FROM flight_groups fg
JOIN group_seat_buckets gsb ON fg.id = gsb.flight_group_id;
```

### Redis
```bash
# Check Redis
redis-cli ping

# Monitor jobs
redis-cli MONITOR

# List queues
redis-cli KEYS "bull:*"
```

### Logs
```bash
# View all logs
tail -f logs/*.log

# View errors only
tail -f logs/error.log

# Search logs
grep "ERROR" logs/*.log
grep "booking-id" logs/*.log
```

---

## 🔐 Quick API Tests

### 1. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"agencyCode":"ABC123","username":"admin","password":"password123"}'

# Save token
export TOKEN="your-token-here"
```

### 2. Create Group
```bash
curl -X POST http://localhost:3000/api/groups \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "carrierCode":"PK","flightNumber":"301","origin":"LHE","destination":"KHI",
    "departureTimeUtc":"2025-12-15T10:00:00Z","arrivalTimeUtc":"2025-12-15T12:00:00Z",
    "pnrMode":"GROUP_PNR","salesStart":"2025-11-01T00:00:00Z","salesEnd":"2025-12-14T23:59:59Z",
    "seatBuckets":[{"paxType":"ADT","totalSeats":50,"baseFare":15000,"taxAmount":2000,"currency":"PKR"}]
  }'
```

### 3. Create Booking
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"flightGroupId":"group-id","passengers":{"adults":2,"children":1,"infants":0}}'
```

### 4. List Bookings
```bash
curl -X GET http://localhost:3000/api/bookings \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🐛 Troubleshooting

### Server won't start
```bash
# Check port
lsof -i :3000
kill -9 <PID>

# Check MySQL
systemctl status mysql

# Check Redis
redis-cli ping
```

### Database issues
```bash
# Reset database
mysql -u root -p -e "DROP DATABASE flight_group_db; CREATE DATABASE flight_group_db;"
node src/database/migrations/migrate.js
```

### Redis issues
```bash
# Restart Redis
sudo systemctl restart redis

# Clear Redis
redis-cli FLUSHALL
```

### JWT issues
```bash
# Decode token
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq
```

---

## 📊 Test Results Interpretation

### Structure Test Results
- **60/62 passed** = ✅ Production ready
- **55-59 passed** = ⚠️ Minor issues
- **<55 passed** = ❌ Major issues

### API Test Results
- **All 2xx/401/403** = ✅ Expected behavior
- **500 errors** = ❌ Server issues
- **Connection refused** = ❌ Server not running

---

## 🎯 Key Test Scenarios

### 1. Authentication Flow
```bash
# Login → Get token → Use token → Refresh → Logout
```

### 2. Booking Lifecycle
```bash
# Create → Approve → Upload Payment → Mark Paid → Issue
```

### 3. Seat Management
```bash
# Check availability → Hold seats → Release/Issue
```

### 4. Concurrent Bookings
```bash
# Multiple simultaneous bookings for same group
```

---

## 📁 Test Files Location

```
tests/
├── integration/
│   ├── groups.test.js
│   └── bookings.test.js
├── unit/
│   ├── app.test.js
│   └── pnrManagement.test.js
└── setup.js
```

---

## 🔍 Quick Checks

### Is everything working?
```bash
✓ npm test passes
✓ ./test-requirements.sh shows 60+ passed
✓ Server starts without errors
✓ Can login via API
✓ Can create booking
✓ Redis is responding
✓ Database has tables
```

### Common Issues
```bash
✗ Port 3000 in use → kill process
✗ MySQL not running → start MySQL
✗ Redis not running → start Redis
✗ Missing .env → copy from .env.example
✗ JWT error → check JWT_SECRET in .env
```

---

## 📖 Full Documentation

- **TESTING_GUIDE.md** - Comprehensive testing guide
- **TEST_RESULTS_SUMMARY.md** - Latest test results
- **FIXES_APPLIED.md** - Security fixes applied
- **PRD.md** - Product requirements
- **README.md** - Project overview

---

## 🎓 Testing Best Practices

1. **Always test locally first**
2. **Run structure tests before API tests**
3. **Check logs for errors**
4. **Verify database state after tests**
5. **Clean up test data**
6. **Document any issues found**

---

**Quick Help:** For detailed testing instructions, see `TESTING_GUIDE.md`
