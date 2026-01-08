# CFi Ideation Team - Digital Productivity Course

A comprehensive LMS for an 8-week digital productivity tools course, now powered by PostgreSQL for scalable cloud deployment.

## Features

- Student registration with email verification
- Password reset functionality
- Secure authentication system
- 8-week course structure:
  - Week 1: Gmail - Email management and communication
  - Week 2: Google Docs + Google Drive - Document creation and file management
  - Week 3: Google Calendar + Google Meet - Scheduling and virtual meetings
  - Week 4: Trello - Project management with Kanban boards
  - Week 5: Google Forms - Surveys and data collection
  - Week 6: Google Keep - Note organization and management
  - Week 7: Google Sheets - Spreadsheet creation and data analysis
  - Week 8: Graduation/Closing - Final assessment and certification
- Progress tracking for videos and assignments
- Clean, responsive interface with tool logos
- Admin dashboard for content and student management
- **NEW**: PostgreSQL database for production deployment
- **NEW**: Vercel-ready configuration
- **NEW**: Email verification system
- **NEW**: Password reset via email

## Quick Start

### Local Development
1. Install dependencies:
```bash
npm install
```

2. Set up PostgreSQL database and environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Start the server:
```bash
npm start
```

4. Open http://localhost:3000 in your browser

### Production Deployment (Vercel)
See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## Database

**MIGRATED**: Now uses PostgreSQL instead of SQLite for production scalability.
- Automatic table creation on startup
- Connection pooling for performance
- Vercel Postgres, Neon, or Supabase compatible
- Full async/await implementation

## Course Structure

- **Week 1**: Gmail - Email management and professional communication
- **Week 2**: Google Docs + Google Drive - Document creation and cloud file management
- **Week 3**: Google Calendar + Google Meet - Scheduling and virtual meetings
- **Week 4**: Trello - Project management with Kanban boards
- **Week 5**: Google Forms - Surveys and data collection
- **Week 6**: Google Keep - Note organization and management
- **Week 7**: Google Sheets - Spreadsheet creation and data analysis
- **Week 8**: Graduation/Closing - Final assessment and certification