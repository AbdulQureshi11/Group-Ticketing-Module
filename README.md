# Group Ticketing Module

A full-stack application with Node.js backend and React frontend for group ticketing functionality, featuring user authentication.

## Description

This module provides a basic server setup for handling group ticketing operations, now including a simple login system with JWT authentication. The backend is built with Express.js, and the frontend uses React.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/AbdulQureshi11/Group-Ticketing-Module.git
   ```

2. Navigate to the project directory:
   ```bash
   cd Group-Ticketing-Module
   ```

3. Install backend dependencies:
   ```bash
   npm install
   ```

4. Install frontend dependencies:
   ```bash
   cd client && npm install && cd ..
   ```

## Usage

To start both the backend and frontend development servers:

```bash
npm run dev
```

- Backend will run on `http://localhost:9000`
- Frontend will run on `http://localhost:3000`

Visit `http://localhost:3000` to access the login page.

### Sample Credentials
- Username: `admin`
- Password: `password`

## API

- `GET /`: Returns "Hello World!"
- `POST /login`: Authenticates user and returns JWT token. Body: `{ "username": "string", "password": "string" }`

## Scripts

- `npm run dev`: Start both backend and frontend concurrently.
- `npm run server`: Start the backend server with nodemon.
- `npm run client`: Start the React frontend.
- `npm test`: Placeholder for tests (not implemented).

## Author

AI Digital System Team

## License

MIT
