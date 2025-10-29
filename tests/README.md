# Testing Guide

This document provides comprehensive testing instructions for the Flight Group API.

## Test Structure

```
tests/
├── setup.js              # Global test setup and configuration
├── unit/                 # Unit tests
│   ├── app.test.js       # Application-level tests
│   ├── errorHandling.test.js
│   ├── middleware.test.js
│   ├── seatManagement.test.js
│   ├── pnrManagement.test.js
│   └── utils/
│       └── jwt.test.js
├── integration/          # Integration tests (API endpoints)
│   ├── auth.test.js      # Authentication endpoints
│   ├── groups.test.js    # Groups management
│   ├── bookings.test.js  # Booking workflow
│   ├── pricing.test.js   # Pricing calculations
│   └── backgroundJobs.test.js
└── e2e/                 # End-to-end tests
    └── bookingWorkflow.test.js
```

## Running Tests

### Prerequisites
- Node.js installed
- Test database configured
- Environment variables set

### Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/integration/auth.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should login with valid credentials"
```

## Test Categories

### Unit Tests
- Test individual functions and utilities
- Mock external dependencies
- Focus on isolated functionality

### Integration Tests
- Test API endpoints with real database
- Test complete request/response cycles
- Verify data persistence and retrieval

### End-to-End Tests
- Test complete user workflows
- Simulate real user interactions
- Cover critical business processes

## Test Data Setup

Tests automatically create and clean up test data:
- Test agencies with unique codes
- Test users with different roles
- Test flight groups and bookings
- Proper cleanup after each test suite

## Environment Configuration

Tests use `.env.test` file with test-specific settings:
- Separate test database
- Test JWT secrets
- Mock external services

## Mocking Strategy

- **Redis**: Mocked to avoid external dependencies
- **Email Services**: Mocked for background jobs
- **External APIs**: Mocked for third-party integrations
- **File Uploads**: Mocked for payment proofs

## Coverage Requirements

Current test coverage includes:
- API endpoints and routes
- Authentication and authorization
- Business logic validation
- Error handling scenarios
- Database operations
- Background job queuing

## Writing New Tests

### Test Structure Pattern
```javascript
describe('Feature Name', () => {
  describe('Endpoint /path', () => {
    it('should handle success case', async () => {
      // Arrange
      // Act
      // Assert
    });

    it('should handle error case', async () => {
      // Test error scenarios
    });
  });
});
```

### Authentication in Tests
Most tests require authentication. Use helper functions to:
- Create test users
- Generate JWT tokens
- Set Authorization headers

### Database Testing
- Tests use transactions where possible
- Cleanup after each test
- Use test-specific data to avoid conflicts

## Continuous Integration

Tests are designed to run in CI/CD pipelines:
- No external dependencies required
- Fast execution with proper mocking
- Clear pass/fail criteria
- Detailed error reporting

## Troubleshooting

### Common Issues
1. **Database connection errors**: Ensure test database is accessible
2. **Token expiration**: Tests use short-lived tokens
3. **Race conditions**: Tests run sequentially to avoid conflicts
4. **Mock failures**: Verify mock implementations match actual interfaces

### Debug Mode
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test with debugging
npm test -- --inspect-brk tests/integration/auth.test.js
```
