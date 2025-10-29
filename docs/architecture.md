# Architecture Overview

## Directory Structure

- `src/app.js` - Express app setup
- `src/server.js` - Server startup
- `src/config/` - Configuration files
- `src/core/` - Core utilities, middleware, constants
- `src/database/` - Models, migrations, seeders
- `src/modules/` - Feature modules (auth, agencies, etc.)
- `src/services/` - Shared services
- `src/jobs/` - Background job queues and workers
- `tests/` - Test suites
- `docs/` - Documentation

## Technologies

- Node.js
- Express.js
- Sequelize ORM
- Redis for caching and queues
- JWT for authentication
- Bull for job queues
