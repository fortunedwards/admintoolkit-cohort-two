# Railway Deployment Guide

## Deploy to Railway

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Initialize Railway project**:
   ```bash
   railway init
   ```

4. **Deploy**:
   ```bash
   railway up
   ```

## Environment Variables

Railway will automatically detect and use:
- `PORT` - Automatically set by Railway
- `NODE_ENV=production` - Set automatically

## Database

The app uses PostgreSQL. Set up Railway's PostgreSQL addon and configure the DATABASE_URL environment variable.

## Admin Access

- Email: cfi.ideation@gmail.com
- Password: admintoolkit

## Features

- Automatic database initialization
- File uploads (stored in /tmp/uploads in production)
- Health check endpoint at `/api/health`
- Session management
- Student progress tracking