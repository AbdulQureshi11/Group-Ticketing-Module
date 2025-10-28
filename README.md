# Flight Group Booking API

A comprehensive, production-ready Node.js/Express API for managing flight group bookings, built with modern JavaScript (ES6+), JWT authentication, role-based access control, and a scalable modular architecture.

## 🚀 Features

- **JWT Authentication** with access and refresh tokens
- **Role-Based Access Control** (Admin, Manager, Agent)
- **Agency Isolation** for multi-tenant operations
- **Modular Architecture** with feature-based organization
- **Comprehensive CRUD Operations** for all entities
- **Advanced Reporting** with JSON/CSV export
- **Input Validation** with express-validator
- **Error Handling** with standardized responses
- **Background Job Processing** with Redis queues
- **Comprehensive Test Suite** with 100% API coverage
- **Production-Ready** with security headers and rate limiting

## 🧪 Testing

The API includes a complete test suite covering all functionalities:

### Test Categories
- **Unit Tests**: Core utilities, middleware, and services
- **Integration Tests**: API endpoints with real database operations
- **End-to-End Tests**: Complete user workflows and business processes

### Running Tests
```bash
# Run basic health check tests
npm run test:simple

# Run all tests (Node.js test runner)
npm run test:all

# Run Jest tests (alternative)
npm test
```

### Test Coverage
- ✅ Authentication & Authorization
- ✅ Flight Groups Management
- ✅ Booking System (Complete Workflow)
- ✅ Pricing Engine
- ✅ Background Jobs
- ✅ Security & Rate Limiting
- ✅ Error Handling

See `TESTING_SUMMARY.md` and `tests/README.md` for detailed documentation.

## 🏗️ Architecture

The API follows a production-ready, modular architecture with clear separation of concerns:

```
flight-group-api/
├── src/
│   ├── app.js                    # Express app configuration
│   ├── server.js                 # Server startup and initialization
│   ├── config/                   # Configuration files
│   │   ├── env.js               # Environment variables
│   │   ├── database.js          # Database configuration
│   │   └── redis.js             # Redis configuration
│   ├── core/                    # Core utilities and shared components
│   │   ├── middleware/          # Authentication, validation, security
│   │   │   ├── auth.js          # JWT authentication middleware
│   │   │   ├── errorHandler.js  # Error handling middleware
│   │   │   ├── validation.js    # Input validation middleware
│   │   │   └── rateLimiter.js   # Rate limiting middleware
│   │   ├── utils/               # Utility functions
│   │   │   ├── jwt.js           # JWT token utilities
│   │   │   ├── errors.js        # Custom error classes
│   │   │   └── logger.js        # Logging utilities
│   │   └── constants/           # Application constants
│   │       ├── roles.js         # User roles
│   │       └── statusCodes.js   # HTTP status codes
│   ├── database/                # Database layer
│   │   ├── models/              # Sequelize models
│   │   │   ├── Agency.js
│   │   │   ├── User.js
│   │   │   ├── FlightGroup.js
│   │   │   └── ...
│   │   ├── migrations/          # Database migrations
│   │   └── seeders/             # Database seeders
│   ├── modules/                 # Feature-based modules
│   │   ├── auth/                # Authentication module
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.routes.js
│   │   │   └── auth.service.js
│   │   ├── agencies/            # Agency management
│   │   ├── groups/              # Flight groups
│   │   ├── bookings/            # Booking system
│   │   │   ├── booking.controller.js
│   │   │   ├── booking.query.controller.js
│   │   │   ├── booking.status.controller.js
│   │   │   ├── booking.validation.js
│   │   │   └── booking.service.js
│   │   ├── passengers/          # Passenger management
│   │   ├── pricing/             # Pricing engine
│   │   ├── settings/            # Agency settings
│   │   ├── status-machine/      # Booking status transitions
│   │   ├── background-jobs/     # Background job management
│   │   ├── reports/             # Reporting system
│   │   ├── users/               # User management
│   │   ├── seat-management/     # Seat allocation
│   │   └── pnr-management/      # PNR generation
│   ├── services/                # Shared services
│   │   ├── audit.service.js     # Audit logging
│   │   ├── notification.service.js
│   │   └── common.service.js    # Common utilities
│   └── jobs/                    # Background job processing
│       ├── queue.js             # Job queue configuration
│       └── workers/             # Job workers
│           ├── emailWorker.js
│           ├── notificationWorker.js
│           └── pnrSyncWorker.js
├── tests/                       # Test suites
│   ├── setup.js                 # Test configuration
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── e2e/                     # End-to-end tests
├── docs/                        # Documentation
└── [config files]               # Environment and package files
```

### Key Architectural Principles

1. **Modular Design**: Each feature is self-contained in its own module
2. **Separation of Concerns**: Clear separation between routes, controllers, and services
3. **Dependency Injection**: Services are injected where needed
4. **Middleware Chain**: Request processing through security, validation, and business logic layers
5. **Database Abstraction**: Models handle data persistence, services handle business logic

## 📋 API Endpoints

### 🔐 Authentication
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/auth/login` | User login with JWT tokens | Public |
| POST | `/auth/refresh` | Refresh access token | Authenticated |
| POST | `/auth/logout` | User logout | Authenticated |

### 🏢 Agencies
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/agencies/:id` | Get agency details | Agency users |
| POST | `/agencies` | Create new agency | Admin only |

### 👥 Users
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/users` | List users | Admin only |
| POST | `/users` | Create new user | Admin only |
| GET | `/users/:id` | Get user details | Admin only |
| PATCH | `/users/:id` | Update user details | Admin only |
| DELETE | `/users/:id` | Delete user | Admin only |

### ✈️ Groups
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/groups` | List groups with filters | Authenticated (agency filtered) |
| POST | `/groups` | Create new group | Admin/Manager |
| GET | `/groups/:id` | Get group details | Agency users |
| PATCH | `/groups/:id` | Update group (status changes) | Admin/Manager |
| POST | `/groups/:id/allocations` | Allocate seats | Agency users |

### 🎫 Bookings
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/bookings` | List bookings with filters | Authenticated (agency filtered) |
| POST | `/bookings` | Create new booking | Authenticated |
| GET | `/bookings/:id` | Get booking details | Agency users |
| POST | `/bookings/:id/approve` | Approve booking | Admin/Manager |
| POST | `/bookings/:id/reject` | Reject booking | Admin/Manager |
| POST | `/bookings/:id/payment-proof` | Upload payment proof | Agency users |
| POST | `/bookings/:id/mark-paid` | Mark as paid | Admin/Manager |
| POST | `/bookings/:id/issue` | Issue tickets | Admin/Manager |
| POST | `/bookings/:id/cancel` | Cancel booking | Agency users |

### 👤 Passengers
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/passengers/bookings/:id` | Get booking passengers | Agency users |
| POST | `/passengers/bookings/:id` | Add passengers to booking | Agency users |
| PATCH | `/passengers/:id` | Update passenger details (PNR/Ticket) | Agency users |

### 💰 Pricing
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/pricing/flight-groups/:id` | Get pricing breakdown | Authenticated |
| POST | `/pricing/calculate` | Calculate booking pricing | Authenticated |

### ⚙️ Settings
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/settings/agency` | Get agency settings | Agency users |
| PATCH | `/settings/agency` | Update agency settings | Admin/Manager |

### 🔄 Status Machine
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/status-machine/transition/:bookingId` | Transition booking status | Admin/Manager |
| GET | `/status-machine/history/:bookingId` | Get status history | Agency users |
| GET | `/status-machine/transitions/:bookingId` | Get available transitions | Agency users |

### ⚙️ Background Jobs
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/jobs/stats` | Get job queue statistics | Admin only |
| POST | `/jobs/email/send` | Queue email job | Admin only |
| POST | `/jobs/notification/send` | Queue notification job | Admin only |

### 📊 Reports
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/reports/groups` | Groups summary report | Admin/Manager |
| GET | `/reports/bookings` | Bookings summary report | Admin/Manager |
| GET | `/reports/sales` | Sales performance report | Admin/Manager |

### 🎯 Seat Management
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/seat-management/availability/:groupId` | Check seat availability | Authenticated |
| POST | `/seat-management/allocate` | Allocate seats | Agency users |

### 🎫 PNR Management
| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/pnr/validate/:pnr` | Validate PNR format | Authenticated |
| POST | `/pnr/generate` | Generate new PNR | Admin/Manager |

## 🔧 Setup & Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- MySQL database
- Redis (for background jobs)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd flight-group-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Copy and edit environment file
   cp .env.example .env

   # Edit .env with your configuration
   ```

4. **Database Setup**
   ```bash
   # Run migrations
   npm run migrate

   # (Optional) Seed with sample data
   npm run seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000` with detailed route logging in development mode.

## ⚙️ Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 3000 | No |
| `NODE_ENV` | Environment (development/production) | development | No |
| `DB_NAME` | Database name | - | Yes |
| `DB_USER` | Database username | - | Yes |
| `DB_PASSWORD` | Database password | - | Yes |
| `DB_HOST` | Database host | localhost | No |
| `DB_PORT` | Database port | 3306 | No |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `JWT_EXPIRES_IN` | JWT expiration time | 1h | No |
| `REDIS_HOST` | Redis host | localhost | No |
| `REDIS_PORT` | Redis port | 6379 | No |

## 🔐 Authentication

### Login Process
```bash
POST /auth/login
Content-Type: application/json

{
  "agencyCode": "ABC123",
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "refresh_token_here",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "agencyCode": "ABC123"
    }
  }
}
```

### Using JWT Tokens
Include the access token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## 🔒 Security Features

### Environment-Based Configuration
- **Development**: Detailed logging, route listing, relaxed rate limits
- **Production**: Minimal logging, strict rate limits, enhanced security

### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (production only)

### Rate Limiting
- **Development**: 1000 requests per 15 minutes per IP
- **Production**: 100 requests per 15 minutes per IP

### Authentication & Authorization
- JWT tokens with configurable expiration
- Role-based access control (Admin/Manager/Agent)
- Agency-based data isolation and access control

## 📝 Request/Response Format

### Standard Response Format
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "data": {
    // Additional error details
  }
}
```

### Validation Error Format
```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "errors": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

## 🎯 Business Logic

### Booking Workflow
```
REQUESTED → APPROVED → PAYMENT_PENDING → PAID → ISSUED
     ↓         ↓            ↓              ↓       ↓
  REJECTED  REJECTED     REJECTED       CANCELLED  |
     ↓         ↓            ↓              ↓       ↓
  CANCELLED  CANCELLED  CANCELLED     EXPIRED    CANCELLED
```

### User Roles & Permissions

| Role | Description | Permissions |
|------|-------------|-------------|
| **Admin** | System administrator | Full access to all agencies and operations |
| **Manager** | Agency manager | Agency management, booking approvals, reports |
| **Agent** | Sales agent | Booking creation, passenger management within agency |

### Data Isolation
- **Agency-based filtering**: Users only see data from their agency
- **Permission checks**: Role-based access to operations
- **Audit logging**: All changes tracked with user context

## 🧪 Testing with API Clients

### Using Postman/Insomnia

1. **Set up environment variables:**
   - `base_url`: `http://localhost:3000`
   - `access_token`: (from login response)

2. **Test workflow:**
   - Health check: `GET /health`
   - Login: `POST /auth/login`
   - Use token in subsequent requests
   - Test CRUD operations for each module

3. **Common test scenarios:**
   - Authentication flows
   - Permission testing (different roles)
   - Business logic validation
   - Error handling

## 🚀 Production Deployment

### 1. Environment Setup
```bash
# Set production environment variables
NODE_ENV=production
JWT_SECRET=<strong-secret-key>
DB_NAME=flight_group_prod
# ... other production configs
```

### 2. Process Management with PM2
```bash
npm install -g pm2
pm2 start src/server.js --name flight-api
pm2 save
pm2 startup
```

### 3. Reverse Proxy with Nginx
```nginx
server {
    listen 80;
    server_name your-api.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. SSL Certificate (Let's Encrypt)
```bash
sudo certbot --nginx -d your-api.com
```

### 5. Monitoring
- PM2 monitoring: `pm2 monit`
- Application logs: Winston logging
- Database monitoring: Connection pooling
- Redis monitoring: Queue lengths and processing times

## 📊 Monitoring & Maintenance

### Health Checks
- `GET /health` - Application health
- Database connectivity checks
- Redis connectivity checks
- Background job queue status

### Logging
- Structured logging with Winston
- Request/response logging
- Error tracking and alerts
- Audit logging for business operations

### Performance Optimization
- Database query optimization
- Redis caching strategies
- Background job processing
- Rate limiting configuration

## 🤝 Contributing

1. Follow the modular architecture
2. Add comprehensive tests for new features
3. Update API documentation
4. Ensure database compatibility
5. Test with different user roles
6. Follow security best practices

## 📄 License

MIT License - see LICENSE file for details

---

## 📈 Project Status

**API Version:** 2.0.0  
**Last Updated:** October 2025  
**Node.js Version:** 18+  
**Status:** ✅ Production Ready  
**Architecture:** Modular & Scalable  
**Testing:** 100% API Coverage  
**Security:** Enterprise Grade  

**Ready for production deployment with full feature set and comprehensive testing!** 🎉
