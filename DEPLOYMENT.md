# Deployment Guide - PostgreSQL Migration

This project has been migrated from SQLite to PostgreSQL for Vercel deployment.

## Database Migration Summary

### Changes Made:
1. **Dependencies**: Replaced `sqlite3` with `pg` (PostgreSQL client)
2. **Database Connection**: Updated to use PostgreSQL connection pool
3. **SQL Syntax**: Converted all SQLite queries to PostgreSQL syntax
4. **Data Types**: Updated column types (INTEGER → SERIAL, TEXT → VARCHAR, etc.)
5. **Boolean Values**: Changed from 0/1 to TRUE/FALSE
6. **Query Parameters**: Changed from `?` to `$1, $2, $3...`
7. **Async/Await**: Converted all database operations to async/await pattern

### Database Schema (PostgreSQL):

```sql
-- Students table
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  reset_token VARCHAR(255),
  reset_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Progress tracking table
CREATE TABLE progress (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id),
  week INTEGER,
  video_watched BOOLEAN DEFAULT FALSE,
  video_progress REAL DEFAULT 0,
  assignment_submitted BOOLEAN DEFAULT FALSE,
  assignment_file VARCHAR(255),
  assignment_link TEXT,
  approved BOOLEAN DEFAULT FALSE,
  feedback TEXT,
  time_spent INTEGER DEFAULT 0
);

-- Admin accounts table
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);

-- Course content table
CREATE TABLE course_content (
  week INTEGER PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  videoId VARCHAR(255),
  courseDescription TEXT,
  logoUrl TEXT,
  assignmentQuestion TEXT,
  imageIcon TEXT
);
```

## Vercel Deployment Steps

### 1. Prerequisites
- GitHub account
- Vercel account
- PostgreSQL database (Neon, Supabase, or Vercel Postgres)

### 2. Database Setup
Choose one of these PostgreSQL providers:

#### Option A: Vercel Postgres (Recommended)
1. Go to Vercel Dashboard
2. Create new project or select existing
3. Go to Storage tab
4. Create Postgres database
5. Copy the connection string

#### Option B: Neon (Free tier available)
1. Sign up at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string from dashboard

#### Option C: Supabase (Free tier available)
1. Sign up at [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → Database
4. Copy connection string

### 3. Environment Variables
Set these in Vercel Dashboard → Settings → Environment Variables:

```
DATABASE_URL=postgresql://username:password@hostname:port/database
POSTGRES_URL=postgresql://username:password@hostname:port/database
NODE_ENV=production
SESSION_SECRET=your-secure-random-string
EMAIL_USER=cfi.ideation@gmail.com
EMAIL_PASS=your-gmail-app-password
```

### 4. Deploy to Vercel

#### Via GitHub:
1. Push code to GitHub repository
2. Connect repository to Vercel
3. Deploy automatically

#### Via Vercel CLI:
```bash
npm install -g vercel
vercel --prod
```

### 5. Post-Deployment
1. Database tables will be created automatically on first run
2. Default admin account: `cfi.ideation@gmail.com` / `admintoolkit`
3. Test the health endpoint: `https://your-app.vercel.app/api/health`

## Local Development with PostgreSQL

### 1. Install PostgreSQL locally
- Windows: Download from postgresql.org
- macOS: `brew install postgresql`
- Linux: `sudo apt-get install postgresql`

### 2. Create local database
```bash
createdb lms_dev
```

### 3. Set environment variables
Create `.env` file:
```
DATABASE_URL=postgresql://username:password@localhost:5432/lms_dev
NODE_ENV=development
EMAIL_USER=cfi.ideation@gmail.com
EMAIL_PASS=your-gmail-app-password
```

### 4. Run locally
```bash
npm install
npm start
```

## Migration Verification

### Key Changes Verified:
- ✅ All SQLite `db.run()` calls converted to `db.query()`
- ✅ All SQLite `db.get()` calls converted to `db.query()` with `result.rows[0]`
- ✅ All SQLite `db.all()` calls converted to `db.query()` with `result.rows`
- ✅ Boolean values changed from 0/1 to TRUE/FALSE
- ✅ Parameter placeholders changed from `?` to `$1, $2, $3...`
- ✅ AUTOINCREMENT changed to SERIAL
- ✅ INSERT OR IGNORE changed to INSERT ... ON CONFLICT DO NOTHING
- ✅ Transaction handling updated for PostgreSQL
- ✅ Error handling updated for PostgreSQL error codes

### Routes Converted:
- ✅ Registration and login
- ✅ Student progress tracking
- ✅ Video and assignment submission
- ✅ Assignment management
- ✅ Admin authentication
- ✅ Student management
- ✅ Content management
- ✅ Analytics and reporting
- ✅ All CRUD operations

## Troubleshooting

### Common Issues:
1. **Connection Error**: Check DATABASE_URL format
2. **SSL Error**: Ensure SSL is configured for production
3. **Migration Error**: Check PostgreSQL version compatibility
4. **Performance**: Consider connection pooling for high traffic

### Health Check:
Visit `/api/health` to verify:
- Database connection
- Table creation
- Basic functionality

## Performance Considerations

### PostgreSQL Optimizations:
1. **Indexes**: Added on frequently queried columns
2. **Connection Pooling**: Implemented via pg.Pool
3. **Query Optimization**: Parameterized queries prevent SQL injection
4. **Transaction Management**: Proper rollback handling

### Vercel Optimizations:
1. **Function Duration**: Set to 30 seconds max
2. **Memory**: Optimized for serverless environment
3. **Cold Starts**: Minimized with connection pooling