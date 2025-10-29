# Setup Guide - Flight Group Booking API

This guide will walk you through setting up the Flight Group Booking API from scratch.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20.19.5 or higher)
- **npm** (comes with Node.js)
- **MySQL** (v8.0 or higher)
- **Redis** (optional but recommended for background jobs)
- **Git** (for cloning the repository)

### Verify Prerequisites

```bash
# Check Node.js version
node --version  # Should be v20.19.5 or higher

# Check npm version
npm --version

# Check MySQL version
mysql --version

# Check Redis (optional)
redis-cli --version
```

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Group-Ticketing-Module
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Express.js (web framework)
- Sequelize (ORM)
- JWT (authentication)
- Redis (job queue)
- And many more...

### 3. Database Setup

#### Create MySQL Database

```bash
# Login to MySQL
mysql -u root -p

# Create the database
CREATE DATABASE flight_group_db;

# Verify database creation
SHOW DATABASES;

# Exit MySQL
EXIT;
```

### 4. Environment Configuration

#### Copy the example environment file

```bash
cp .env.example .env
```

#### Edit the `.env` file with your configuration

```bash
nano .env  # or use your preferred editor
```

**Required configurations:**

```env
# Database - Update with your MySQL credentials
DB_HOST=localhost
DB_PORT=3306
DB_NAME=flight_group_db
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_DIALECT=mysql

# JWT - IMPORTANT: Generate secure random strings for production
JWT_SECRET=your-super-secure-random-jwt-secret-key-at-least-32-characters
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key-change-this-in-production
REFRESH_TOKEN_EXPIRES_IN=7d

# Server
NODE_ENV=development
PORT=3000
```

**Optional configurations:**

```env
# Redis (for background jobs)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email/SMTP (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 5. Run Database Migrations

This will create all database tables and seed initial data:

```bash
node src/database/migrations/migrate.js
```

**What this does:**
- Creates all database tables (agencies, users, flight_groups, bookings, etc.)
- Seeds 2 sample agencies (ABC123, XYZ456)
- Creates 3 default users (admin, manager, agent)
- Creates sample flight groups (optional)

**Expected output:**
```
🔄 Starting database migration...
📋 Creating tables...
✅ Agencies table created
✅ Agency Settings table created
✅ Users table created
✅ Refresh Tokens table created
✅ Flight Groups table created
...
✅ User admin created
✅ User manager created
✅ User agent created
🎉 Database migration completed successfully!
```

### 6. Start the Server

```bash
node src/server.js
```

**Expected output:**
```
Server running on http://localhost:3000 (env: development)
✅ Database connection has been established successfully.
```

For development with auto-reload:
```bash
npm run dev  # Uses nodemon
```

### 7. Verify Installation

#### Test the health endpoint

```bash
curl http://localhost:3000/health
```

**Expected response:**
```json
{"ok":true}
```

#### Test authentication

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "agencyCode": "ABC123",
    "username": "admin",
    "password": "password123"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "username": "admin",
      "role": "ADMIN",
      "agencyCode": "ABC123",
      "agencyName": "ABC Travel Services"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "..."
  }
}
```

## Default Credentials

After migration, you can login with these users:

| Username | Password | Agency Code | Role | Description |
|----------|----------|-------------|------|-------------|
| admin | password123 | ABC123 | ADMIN | Full system access |
| manager | password123 | ABC123 | MANAGER | Agency management |
| agent | password123 | XYZ456 | SUB_AGENT | Booking operations |

⚠️ **IMPORTANT**: Change these passwords immediately in production!

## Testing the API

```bash
# Run automated endpoint tests
./test-api-endpoints.sh
```

📖 **For detailed API testing examples, see [API_REFERENCE.md](API_REFERENCE.md)**

## Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
1. Verify MySQL is running: `sudo systemctl status mysql`
2. Check credentials in `.env` file
3. Ensure database exists: `mysql -u root -p -e "SHOW DATABASES;"`

### Issue: "JWT token error: expiresIn should be a number or string"

**Solution:**
1. Ensure `.env` contains `JWT_EXPIRES_IN` and `REFRESH_TOKEN_EXPIRES_IN`
2. Restart the server after updating `.env`

### Issue: "Port 3000 already in use"

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

### Issue: "Migration script fails"

**Solution:**
1. Drop and recreate database:
   ```bash
   mysql -u root -p
   DROP DATABASE flight_group_db;
   CREATE DATABASE flight_group_db;
   EXIT;
   ```
2. Run migration again: `node src/database/migrations/migrate.js`

### Issue: "Redis connection failed"

**Solution:**
Redis is optional for development. Either:
1. Install and start Redis: `sudo systemctl start redis`
2. Or ignore the warning (background jobs won't work)

## Next Steps

1. **Change default passwords** for production
2. **Configure email/SMTP** for notifications  
3. **Set up Redis** for background job processing
4. **Review security settings** in production
5. **Test API endpoints** - See [API_REFERENCE.md](API_REFERENCE.md)

## Additional Resources

- **[API_REFERENCE.md](API_REFERENCE.md)** - Complete API documentation with examples
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and recent changes
- **[README.md](README.md)** - Project overview

## Security Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Generate strong JWT secrets (32+ characters)
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper database credentials
- [ ] Set up SSL/TLS certificates
- [ ] Configure rate limiting
- [ ] Enable security headers
- [ ] Set up monitoring and alerts
- [ ] Configure backup strategy
- [ ] Review and restrict CORS settings
- [ ] Disable debug logging
- [ ] Set up firewall rules

---

**Congratulations!** Your Flight Group Booking API is now set up and ready to use! 🎉
