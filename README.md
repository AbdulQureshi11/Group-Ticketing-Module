# Flight Group Booking API

A production-ready Node.js/Express API for managing flight group bookings with JWT authentication, role-based access control, and multi-tenant agency isolation.

## ⚡ Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your database credentials
node src/database/migrations/migrate.js
node src/server.js
```

**Default Login**: `admin` / `Password@123$` (Agency: ABC123)

📖 **[Complete Setup Guide →](SETUP.md)** | **[API Documentation →](API_REFERENCE.md)**

## 🚀 Key Features

- **JWT Authentication** - Secure access and refresh tokens
- **Multi-Tenant** - Agency-based data isolation
- **Role-Based Access** - Admin, Manager, Sub-Agent roles
- **Background Jobs** - Redis-powered async processing
- **Comprehensive API** - 53 endpoints covering all operations
- **Production-Ready** - Security headers, rate limiting, audit logging

## 🔧 Prerequisites

- **Node.js** 20.19.5+
- **MySQL** 8.0+
- **Redis** (optional, for background jobs)

See [.env.example](.env.example) for required environment variables.

## 📁 Project Structure

```
src/
├── modules/          # Feature modules (auth, bookings, groups, etc.)
├── database/         # Models, migrations, seeders
├── core/             # Middleware, utilities, constants
├── config/           # Database, Redis, environment config
└── services/         # Shared business logic
```

**Architecture**: Modular design with feature-based organization, middleware chain, and clear separation of concerns.

## 📋 API Endpoints

**53 endpoints** covering authentication, agencies, users, flight groups, bookings, passengers, pricing, settings, reports, PNR management, and seat allocation.

📖 **[View Complete API Documentation →](API_REFERENCE.md)**




## 🔒 Security

- JWT authentication with access/refresh tokens
- Role-based access control (ADMIN, MANAGER, SUB_AGENT)
- Agency-based data isolation
- Rate limiting (100-1000 req/15min)
- Security headers (HSTS, XSS protection, etc.)
- Audit logging for all operations







## 📚 Documentation

- **[SETUP.md](SETUP.md)** - Complete installation and configuration guide
- **[API_REFERENCE.md](API_REFERENCE.md)** - Detailed API endpoint documentation
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and changes
- **[.env.example](.env.example)** - Environment variables template

## 📈 Status

**Version:** 2.0.0 | **Node.js:** 20.19.5+ | **Database:** MySQL 8.0+

- ✅ 96% API Coverage (30/31 endpoints)
- ✅ Production-ready architecture
- ✅ Comprehensive documentation
- ✅ Security hardened

## 📄 License

MIT License
