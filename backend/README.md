# Umar Messenger API

Backend for registration and authentication.

## Endpoints
- POST /auth/register
- POST /auth/login
- GET /auth/me
- PATCH /auth/profile
- GET /health

Passwords are hashed with bcrypt. Sessions use signed JWT access tokens.

## Environment
DATABASE_URL=postgresql://...
JWT_SECRET=long-random-secret
FRONTEND_ORIGIN=https://zvosrg2012-cyber.github.io

## Start
1. Create a PostgreSQL database.
2. Run schema.sql.
3. npm install
4. npm start
