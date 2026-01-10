const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// File upload setup
const fs = require('fs');
const uploadDir = process.env.NODE_ENV === 'production' ? '/tmp/uploads' : 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Email setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { 
    user: process.env.EMAIL_USER || 'cfi.ideation@gmail.com', 
    pass: process.env.EMAIL_PASS || 'your-app-password' 
  }
});

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const db = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Initialize database tables
async function initializeDatabase() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      email_verified BOOLEAN DEFAULT FALSE,
      verification_token VARCHAR(255),
      reset_token VARCHAR(255),
      reset_expires TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS progress (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id),
      week INTEGER,
      video_watched BOOLEAN DEFAULT FALSE,
      video_progress REAL DEFAULT 0,
      video2_watched BOOLEAN DEFAULT FALSE,
      video2_progress REAL DEFAULT 0,
      assignment_submitted BOOLEAN DEFAULT FALSE,
      assignment_file VARCHAR(255),
      assignment_link TEXT,
      assignment2_submitted BOOLEAN DEFAULT FALSE,
      assignment2_file VARCHAR(255),
      assignment2_link TEXT,
      approved BOOLEAN DEFAULT FALSE,
      approved2 BOOLEAN DEFAULT FALSE,
      feedback TEXT,
      feedback2 TEXT,
      time_spent INTEGER DEFAULT 0
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS course_content (
      week INTEGER PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      videoId VARCHAR(255)
    )`);

    // Insert default course content for Administrative Toolkit
    const defaultContent = [
      [1, 'Week 1: Google Meet + Google Calendar', 'Master virtual meeting coordination and scheduling management for optimal productivity and communication.', 'dQw4w9WgXcQ'],
      [2, 'Week 2: Google Forms + Gmail', 'Create powerful online surveys and questionnaires while mastering professional email management and communication strategies.', 'dQw4w9WgXcQ'],
      [3, 'Week 3: Google Drive + Google Docs', 'Learn cloud file management with advanced sharing permissions and professional document creation with collaborative editing.', 'dQw4w9WgXcQ'],
      [4, 'Week 4: Trello + Google Keep', 'Implement project management workflows with Kanban boards and organize thoughts with digital note-taking and idea management systems.', 'dQw4w9WgXcQ'],
      [5, 'Week 5: Google Sheets', 'Create powerful spreadsheets, data analysis, formulas, charts, and automated reporting for business insights.', 'dQw4w9WgXcQ'],
      [6, 'Week 6: Graduation Week', 'Final assessment, project completion, and certification for Administrative Toolkit mastery.', 'dQw4w9WgXcQ']
    ];
    
    // Force update to correct order - always update existing records
    for (const content of defaultContent) {
      await db.query('INSERT INTO course_content (week, title, description, videoId) VALUES ($1, $2, $3, $4) ON CONFLICT (week) DO UPDATE SET title = $2, description = $3, videoId = $4', content);
    }
    
    console.log('✅ Course content updated to correct 6-week structure');

    // Create default admin (email: cfi.ideation@gmail.com, password: admintoolkit)
    try {
      const hashedPassword = await bcrypt.hash('admintoolkit', 10);
      await db.query('DELETE FROM admins WHERE email = $1', ['cfi.ideation@gmail.com']);
      await db.query('INSERT INTO admins (email, password) VALUES ($1, $2)', ['cfi.ideation@gmail.com', hashedPassword]);
      console.log('✅ Default admin created: cfi.ideation@gmail.com / admintoolkit');
    } catch (adminError) {
      console.error('❌ Admin creation failed:', adminError);
    }
    
    // Add additional columns to course_content if they don't exist
    try {
      await db.query('ALTER TABLE course_content ADD COLUMN courseDescription TEXT');
    } catch (e) { /* Column may already exist */ }
    try {
      await db.query('ALTER TABLE course_content ADD COLUMN logoUrl TEXT');
    } catch (e) { /* Column may already exist */ }
    try {
      await db.query('ALTER TABLE course_content ADD COLUMN assignmentQuestion TEXT');
    } catch (e) { /* Column may already exist */ }
    try {
      await db.query('ALTER TABLE course_content ADD COLUMN imageIcon TEXT');
    } catch (e) { /* Column may already exist */ }
    try {
      await db.query('ALTER TABLE course_content ADD COLUMN videoIds TEXT');
      console.log('✅ Added videoIds column for multiple videos');
    } catch (e) { 
      if (e.code !== '42701') console.log('videoIds column error:', e.message);
    }
    // This section is now handled above
    
    // Add email verification columns to students table
    try {
      await db.query('ALTER TABLE students ADD COLUMN email_verified BOOLEAN DEFAULT FALSE');
      console.log('✅ Added email_verified column');
    } catch (e) { 
      if (e.code !== '42701') console.log('email_verified column error:', e.message);
    }
    
    try {
      await db.query('ALTER TABLE students ADD COLUMN verification_token VARCHAR(255)');
      console.log('✅ Added verification_token column');
    } catch (e) { 
      if (e.code !== '42701') console.log('verification_token column error:', e.message);
    }
    
    try {
      await db.query('ALTER TABLE students ADD COLUMN reset_token VARCHAR(255)');
      console.log('✅ Added reset_token column');
    } catch (e) { 
      if (e.code !== '42701') console.log('reset_token column error:', e.message);
    }
    
    try {
      await db.query('ALTER TABLE students ADD COLUMN reset_expires TIMESTAMP');
      console.log('✅ Added reset_expires column');
    } catch (e) { 
      if (e.code !== '42701') console.log('reset_expires column error:', e.message);
    }
    
    // Add assignment_link column to progress table
    try {
      await db.query('ALTER TABLE progress ADD COLUMN assignment_link TEXT');
      console.log('✅ Added assignment_link column');
    } catch (e) { 
      if (e.code !== '42701') console.log('assignment_link column error:', e.message);
    }
    
    // Add columns for second video/assignment tracking
    try {
      await db.query('ALTER TABLE progress ADD COLUMN video2_watched BOOLEAN DEFAULT FALSE');
      console.log('✅ Added video2_watched column');
    } catch (e) { 
      if (e.code !== '42701') console.log('video2_watched column error:', e.message);
    }
    
    try {
      await db.query('ALTER TABLE progress ADD COLUMN video2_progress REAL DEFAULT 0');
      console.log('✅ Added video2_progress column');
    } catch (e) { 
      if (e.code !== '42701') console.log('video2_progress column error:', e.message);
    }
    
    try {
      await db.query('ALTER TABLE progress ADD COLUMN assignment2_submitted BOOLEAN DEFAULT FALSE');
      console.log('✅ Added assignment2_submitted column');
    } catch (e) { 
      if (e.code !== '42701') console.log('assignment2_submitted column error:', e.message);
    }
    
    try {
      await db.query('ALTER TABLE progress ADD COLUMN assignment2_file VARCHAR(255)');
      console.log('✅ Added assignment2_file column');
    } catch (e) { 
      if (e.code !== '42701') console.log('assignment2_file column error:', e.message);
    }
    
    try {
      await db.query('ALTER TABLE progress ADD COLUMN assignment2_link TEXT');
      console.log('✅ Added assignment2_link column');
    } catch (e) { 
      if (e.code !== '42701') console.log('assignment2_link column error:', e.message);
    }
    
    try {
      await db.query('ALTER TABLE progress ADD COLUMN approved2 BOOLEAN DEFAULT FALSE');
      console.log('✅ Added approved2 column');
    } catch (e) { 
      if (e.code !== '42701') console.log('approved2 column error:', e.message);
    }
    
    try {
      await db.query('ALTER TABLE progress ADD COLUMN feedback2 TEXT');
      console.log('✅ Added feedback2 column');
    } catch (e) { 
      if (e.code !== '42701') console.log('feedback2 column error:', e.message);
    }
    
    // Force add email verification columns if missing
    try {
      const checkColumns = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='students' AND column_name IN ('email_verified', 'verification_token', 'reset_token', 'reset_expires')
      `);
      
      const existingColumns = checkColumns.rows.map(row => row.column_name);
      
      if (!existingColumns.includes('email_verified')) {
        await db.query('ALTER TABLE students ADD COLUMN email_verified BOOLEAN DEFAULT FALSE');
        console.log('✅ Added missing email_verified column');
      }
      
      if (!existingColumns.includes('verification_token')) {
        await db.query('ALTER TABLE students ADD COLUMN verification_token VARCHAR(255)');
        console.log('✅ Added missing verification_token column');
      }
      
      if (!existingColumns.includes('reset_token')) {
        await db.query('ALTER TABLE students ADD COLUMN reset_token VARCHAR(255)');
        console.log('✅ Added missing reset_token column');
      }
      
      if (!existingColumns.includes('reset_expires')) {
        await db.query('ALTER TABLE students ADD COLUMN reset_expires TIMESTAMP');
        console.log('✅ Added missing reset_expires column');
      }
    } catch (e) { 
      console.log('Email verification column check error:', e.message);
    }
    
    // Clean up old structure - remove weeks 7 and 8, keep only 6 weeks
    try {
      await db.query('DELETE FROM course_content WHERE week > 6');
      await db.query('DELETE FROM progress WHERE week > 6');
      console.log('✅ Cleaned up old weeks 7-8 data, now 6-week structure');
    } catch (e) { console.log('Note: No old weeks to clean up'); }

    
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Initialize database on startup
initializeDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));

// Static files FIRST with proper MIME types
app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'cfi-admin-toolkit-2024-secure-key-very-long-and-secure',
  resave: true,
  saveUninitialized: true,
  rolling: true,
  cookie: { 
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  },
  name: 'cfi-session'
}));

// Routes for static files
app.get('/admin.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'admin.js'));
});

app.get('/dashboard.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'dashboard.js'));
});

app.get('/modal-styles.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, 'public', 'modal-styles.css'));
});

app.get('/cfi-logo.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cfi-logo.png'));
});

app.get('/hephzibah.jpg', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'hephzibah.jpg'));
});

app.get('/fortune.jpg', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'fortune.jpg'));
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/intro.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'intro.html'));
});


app.get('/admin-access', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="utf-8"/>
    <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>Admin Login - CFi Ideation Team</title>
    <link rel="icon" type="image/png" href="/cfi-logo.png"/>
    <link rel="apple-touch-icon" href="/cfi-logo.png"/>
    <link href="https://fonts.googleapis.com" rel="preconnect"/>
    <link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet"/>
    <script src="https://cdn.tailwindcss.com?plugins=forms"></script>
    <script>
        tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              colors: {
                "primary": "#137fec",
                "background-light": "#f6f7f8",
                "background-dark": "#101c22",
              },
              fontFamily: {
                "display": ["Inter"]
              },
              borderRadius: {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "full": "9999px"
              },
            },
          },
        }
      </script>
    </head>
    <body class="bg-background-light dark:bg-background-dark font-display text-gray-800 dark:text-gray-200">
    <div class="flex items-center justify-center min-h-screen p-4">
    <div class="w-full max-w-md mx-auto">
    <div class="text-center mb-6">
    <div class="flex items-center justify-center gap-3">
    <img src="/cfi-logo.png" alt="CFi Logo" class="h-8 w-8">
    <h2 class="text-xl font-bold text-slate-800 dark:text-white">CFi Ideation Team</h2>
    </div>
    </div>
    <div class="bg-white dark:bg-background-dark dark:border dark:border-gray-700 rounded-xl shadow-lg">
    <div class="flex border-b border-gray-200 dark:border-gray-700">
    <div class="w-full p-4 text-center font-semibold border-b-2 border-primary text-primary">
    Admin Login
    </div>
    </div>
    <div class="p-6 md:p-8">
    <div class="hidden p-3 mb-4 rounded text-center text-sm" id="message-area"></div>
    <div>
    <form onsubmit="adminLogin(event)" class="space-y-6" method="POST">
    <div>
    <label class="sr-only" for="admin-email">Email</label>
    <input class="w-full px-4 py-3 bg-background-light dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary placeholder-gray-500 dark:placeholder-gray-400" id="admin-email" name="email" placeholder="Admin Email" required="" type="email"/>
    </div>
    <div>
    <label class="sr-only" for="admin-password">Password</label>
    <input class="w-full px-4 py-3 bg-background-light dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary placeholder-gray-500 dark:placeholder-gray-400" id="admin-password" name="password" placeholder="Admin Password" required="" type="password"/>
    </div>
    <div>
    <button class="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition duration-300" type="submit">Admin Login</button>
    </div>
    </form>
    </div>
    </div>
    </div>
    <div class="text-center mt-6">
    <a class="text-sm text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary" href="index.html">← Back to Course Info</a>
    </div>
    </div>
    </div>
    <script>
        function showMessage(message, type) {
          const messageArea = document.getElementById('message-area');
          messageArea.textContent = message;
          messageArea.classList.remove('hidden');
          if (type === 'success') {
            messageArea.classList.add('bg-green-100', 'text-green-800', 'dark:bg-green-900', 'dark:text-green-200');
            messageArea.classList.remove('bg-red-100', 'text-red-800', 'dark:bg-red-900', 'dark:text-red-200');
          } else if (type === 'error') {
            messageArea.classList.add('bg-red-100', 'text-red-800', 'dark:bg-red-900', 'dark:text-red-200');
            messageArea.classList.remove('bg-green-100', 'text-green-800', 'dark:bg-green-900', 'dark:text-green-200');
          }
        }
        
        async function adminLogin(event) {
            event.preventDefault();
            const form = event.target;
            const email = form.querySelector('input[type="email"]').value;
            const password = form.querySelector('input[type="password"]').value;
            
            try {
                const response = await fetch('/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Store session info and redirect
                    sessionStorage.setItem('adminLoggedIn', 'true');
                    window.location.href = '/admin';
                } else {
                    showMessage(result.message, 'error');
                }
            } catch (error) {
                showMessage('Admin login failed. Please try again.', 'error');
            }
        }
    </script>
    
    </body>
    </html>
  `);
});

app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.json({ success: false, message: 'All fields are required' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Attempting to register user:', email);
    
    // Register without email verification for now
    const result = await db.query('INSERT INTO students (name, email, password) VALUES ($1, $2, $3) RETURNING id', 
      [name, email, hashedPassword]);
    
    const studentId = result.rows[0].id;
    console.log('Student created with ID:', studentId);
    
    // Initialize progress for all 6 weeks
    for (let week = 1; week <= 6; week++) {
      try {
        await db.query('INSERT INTO progress (student_id, week) VALUES ($1, $2)', [studentId, week]);
      } catch (progressError) {
        console.error(`Error creating progress for week ${week}:`, progressError.message);
      }
    }
    
    console.log('Progress records created for student:', studentId);
    
    res.json({ success: true, message: 'Registration successful! You can now login.' });
  } catch (err) {
    console.error('Registration error details:', {
      code: err.code,
      message: err.message,
      detail: err.detail,
      stack: err.stack
    });
    
    if (err.code === '23505') {
      return res.json({ success: false, message: 'Email already exists' });
    }
    
    return res.json({ success: false, message: `Registration failed: ${err.message}` });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  console.log('Login attempt for:', email);
  
  try {
    const result = await db.query('SELECT * FROM students WHERE email = $1', [email]);
    console.log('Database query result:', result.rows.length, 'students found');
    const student = result.rows[0];
    
    if (!student) {
      console.log('No student found with email:', email);
      return res.json({ success: false, message: 'Invalid credentials' });
    }
    
    console.log('Student found:', student.name);
    const validPassword = await bcrypt.compare(password, student.password);
    console.log('Password validation result:', validPassword);
    
    if (!validPassword) {
      return res.json({ success: false, message: 'Invalid credentials' });
    }
    
    req.session.studentId = student.id;
    req.session.studentName = student.name;
    console.log('Student session set:', req.session.studentId);
    
    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('Student session save error:', err);
        return res.json({ success: false, message: 'Session error' });
      }
      console.log('Student login successful, session saved');
      res.json({ success: true, message: 'Login successful' });
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.json({ success: false, message: 'Database error: ' + err.message });
  }
});

app.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  
  try {
    const result = await db.query('SELECT * FROM students WHERE verification_token = $1', [token]);
    const student = result.rows[0];
    
    if (!student) {
      return res.send('<h1>Invalid verification token</h1>');
    }
    
    await db.query('UPDATE students SET email_verified = TRUE, verification_token = NULL WHERE id = $1', [student.id]);
    
    res.send(`
      <html>
        <head><title>Email Verified</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1 style="color: #137fec;">Email Verified Successfully!</h1>
          <p>Your email has been verified. You can now log in to your account.</p>
          <a href="/login.html" style="background: #137fec; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Login</a>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Email verification error:', err);
    res.send('<h1>Verification failed</h1>');
  }
});

app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  try {
    const result = await db.query('SELECT * FROM students WHERE email = $1', [email]);
    const student = result.rows[0];
    
    if (!student) {
      return res.json({ success: false, message: 'Email not found' });
    }
    
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour
    
    await db.query('UPDATE students SET reset_token = $1, reset_expires = $2 WHERE id = $3', 
      [resetToken, resetExpires, student.id]);
    
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
    
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER || 'cfi.ideation@gmail.com',
        to: email,
        subject: 'Password Reset - CFi Administrative Toolkit',
        html: `
          <h2>Password Reset Request</h2>
          <p>Hi ${student.name},</p>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="background: #137fec; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>This link expires in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `
      });
    } catch (emailError) {
      console.log('Password reset email failed:', emailError.message);
    }
    
    res.json({ success: true, message: 'Password reset email sent' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.json({ success: false, message: 'Error processing request' });
  }
});

app.get('/reset-password', (req, res) => {
  const { token } = req.query;
  res.send(`
    <html>
      <head>
        <title>Reset Password</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100 flex items-center justify-center min-h-screen">
        <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 class="text-2xl font-bold mb-6 text-center">Reset Password</h2>
          <form onsubmit="resetPassword(event)">
            <input type="hidden" value="${token}" id="token">
            <div class="mb-4">
              <input type="password" id="password" placeholder="New Password" required class="w-full px-3 py-2 border rounded-lg">
            </div>
            <div class="mb-6">
              <input type="password" id="confirmPassword" placeholder="Confirm Password" required class="w-full px-3 py-2 border rounded-lg">
            </div>
            <button type="submit" class="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600">Reset Password</button>
          </form>
          <div id="message" class="mt-4 text-center"></div>
        </div>
        <script>
          async function resetPassword(e) {
            e.preventDefault();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const token = document.getElementById('token').value;
            
            if (password !== confirmPassword) {
              document.getElementById('message').innerHTML = '<p class="text-red-500">Passwords do not match</p>';
              return;
            }
            
            try {
              const response = await fetch('/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
              });
              
              const result = await response.json();
              
              if (result.success) {
                document.getElementById('message').innerHTML = '<p class="text-green-500">Password reset successful! <a href="/login.html" class="underline">Login here</a></p>';
              } else {
                document.getElementById('message').innerHTML = '<p class="text-red-500">' + result.message + '</p>';
              }
            } catch (error) {
              document.getElementById('message').innerHTML = '<p class="text-red-500">Error resetting password</p>';
            }
          }
        </script>
      </body>
    </html>
  `);
});

app.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  
  try {
    const result = await db.query('SELECT * FROM students WHERE reset_token = $1 AND reset_expires > NOW()', [token]);
    const student = result.rows[0];
    
    if (!student) {
      return res.json({ success: false, message: 'Invalid or expired reset token' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query('UPDATE students SET password = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2', 
      [hashedPassword, student.id]);
    
    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.json({ success: false, message: 'Error resetting password' });
  }
});

app.get('/dashboard', (req, res) => {
  console.log('Dashboard access attempt. Session:', req.session.studentId ? 'exists' : 'missing');
  if (!req.session.studentId) {
    console.log('No session found, redirecting to login');
    return res.redirect('/login.html');
  }
  console.log('Session valid, serving dashboard');
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/test-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test-dashboard.html'));
});

app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const contentResult = await db.query('SELECT COUNT(*) as count FROM course_content');
    const studentResult = await db.query('SELECT COUNT(*) as count FROM students');
    const sampleStudent = await db.query('SELECT email FROM students LIMIT 1');
    
    res.json({ 
      success: true, 
      courseContent: parseInt(contentResult.rows[0].count),
      students: parseInt(studentResult.rows[0].count),
      sampleStudent: sampleStudent.rows[0]?.email || 'none',
      database: 'PostgreSQL',
      nodeEnv: process.env.NODE_ENV,
      session: req.session.studentId ? 'active' : 'none'
    });
  } catch (err) {
    console.error('Health check error:', err);
    return res.json({ 
      success: false, 
      error: err.message,
      database: 'PostgreSQL',
      nodeEnv: process.env.NODE_ENV
    });
  }
});

app.get('/api/init-db', async (req, res) => {
  try {
    await initializeDatabase();
    res.json({ success: true, message: 'Database initialized successfully' });
  } catch (err) {
    console.error('Manual DB init error:', err);
    res.json({ success: false, error: err.message });
  }
});

app.get('/debug-admin', async (req, res) => {
  try {
    const result = await db.query('SELECT email, password FROM admins');
    const admin = result.rows[0];
    const testPassword = admin ? await bcrypt.compare('admintoolkit', admin.password) : false;
    
    res.json({ 
      adminExists: result.rows.length > 0,
      adminEmail: admin?.email,
      passwordTest: testPassword
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get('/create-admin-force', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash('admintoolkit', 10);
    await db.query('DELETE FROM admins WHERE email = $1', ['cfi.ideation@gmail.com']);
    await db.query('INSERT INTO admins (email, password) VALUES ($1, $2)', ['cfi.ideation@gmail.com', hashedPassword]);
    
    res.json({ success: true, message: 'Admin created successfully' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.get('/cleanup-old-weeks', async (req, res) => {
  try {
    // Force delete weeks 7 and 8
    await db.query('DELETE FROM course_content WHERE week > 6');
    await db.query('DELETE FROM progress WHERE week > 6');
    
    res.json({ success: true, message: 'Old weeks 7-8 deleted successfully' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});



app.get('/api/progress', async (req, res) => {
  console.log('Progress request - Session studentId:', req.session.studentId);
  if (!req.session.studentId) {
    return res.json({ success: false, message: 'Not authenticated' });
  }
  
  try {
    // Ensure progress records exist before fetching
    await ensureProgressRecords(req.session.studentId);
    
    const result = await db.query('SELECT * FROM progress WHERE student_id = $1 ORDER BY week', 
      [req.session.studentId]);
    
    res.json({ success: true, progress: result.rows, studentName: req.session.studentName });
  } catch (err) {
    console.error('Progress fetch error:', err);
    return res.json({ success: false, message: 'Error fetching progress' });
  }
});

app.post('/api/mark-video-complete', async (req, res) => {
  const { week, videoNumber } = req.body;
  
  if (!req.session.studentId) {
    return res.json({ success: false, message: 'Not authenticated' });
  }
  
  try {
    await ensureProgressRecords(req.session.studentId);
    
    if (videoNumber === 2) {
      await db.query('UPDATE progress SET video2_watched = TRUE WHERE student_id = $1 AND week = $2',
        [req.session.studentId, week]);
    } else {
      await db.query('UPDATE progress SET video_watched = TRUE WHERE student_id = $1 AND week = $2',
        [req.session.studentId, week]);
    }
    
    res.json({ success: true, message: 'Video marked as complete!' });
  } catch (err) {
    console.error('Error updating video progress:', err);
    return res.json({ success: false, message: 'Error marking video complete' });
  }
});

// Helper function to ensure progress records exist for a student
async function ensureProgressRecords(studentId) {
  try {
    const result = await db.query('SELECT week FROM progress WHERE student_id = $1', [studentId]);
    const existingWeekNumbers = result.rows.map(w => w.week);
    const missingWeeks = [];
    
    for (let week = 1; week <= 6; week++) {
      if (!existingWeekNumbers.includes(week)) {
        missingWeeks.push(week);
      }
    }
    
    if (missingWeeks.length === 0) {
      return;
    }
    
    // Insert missing progress records
    for (const week of missingWeeks) {
      await db.query('INSERT INTO progress (student_id, week) VALUES ($1, $2)', [studentId, week]);
    }
  } catch (err) {
    console.error('Error ensuring progress records:', err);
  }
}

app.post('/api/watch-video', async (req, res) => {
  const { week } = req.body;
  
  try {
    await db.query('UPDATE progress SET video_watched = TRUE WHERE student_id = $1 AND week = $2',
      [req.session.studentId, week]);
    
    res.json({ success: true, message: 'Video marked as watched' });
  } catch (err) {
    console.error('Watch video error:', err);
    return res.json({ success: false, message: 'Error updating progress' });
  }
});

app.post('/api/update-video-progress', async (req, res) => {
  const { week, progress, timeSpent } = req.body;
  
  try {
    await db.query('UPDATE progress SET video_progress = $1, time_spent = time_spent + $2, video_watched = $3 WHERE student_id = $4 AND week = $5',
      [progress, timeSpent || 0, progress >= 0.9, req.session.studentId, week]);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Update video progress error:', err);
    return res.json({ success: false, message: 'Error updating progress' });
  }
});

app.post('/api/submit-assignment', upload.single('file'), async (req, res) => {
  const { week, link, assignmentNumber } = req.body;
  const fileName = req.file ? req.file.filename : null;
  
  if (!req.session.studentId) {
    return res.json({ success: false, message: 'Not authenticated' });
  }
  
  if (!fileName && !link) {
    return res.json({ success: false, message: 'Please provide either a file or a link' });
  }
  
  try {
    // Ensure progress record exists
    await ensureProgressRecords(req.session.studentId);
    
    let result;
    if (assignmentNumber === '2') {
      result = await db.query('UPDATE progress SET assignment2_submitted = TRUE, assignment2_file = $1, assignment2_link = $2 WHERE student_id = $3 AND week = $4',
        [fileName, link || null, req.session.studentId, week]);
    } else {
      result = await db.query('UPDATE progress SET assignment_submitted = TRUE, assignment_file = $1, assignment_link = $2 WHERE student_id = $3 AND week = $4',
        [fileName, link || null, req.session.studentId, week]);
    }
    
    console.log('Assignment update result:', result.rowCount, 'rows affected');
    
    if (result.rowCount === 0) {
      return res.json({ success: false, message: 'Progress record not found for this week' });
    }
    
    res.json({ success: true, message: 'Assignment submitted' });
  } catch (err) {
    console.error('Submit assignment error:', err.message, err.stack);
    return res.json({ success: false, message: 'Error updating progress: ' + err.message });
  }
});

// Get assignments for admin review
app.get('/api/admin/assignments', async (req, res) => {
  if (!req.session.adminId) return res.json({ success: false, message: 'Not authorized' });
  
  try {
    const result = await db.query(`
      SELECT DISTINCT s.id as student_id, s.name as student_name, s.email as student_email,
             COUNT(p.week) as total_assignments,
             COUNT(CASE WHEN p.approved = TRUE THEN 1 END) as approved_assignments
      FROM students s 
      JOIN progress p ON s.id = p.student_id 
      WHERE p.assignment_submitted = TRUE
      GROUP BY s.id, s.name, s.email
      ORDER BY total_assignments DESC, s.name
    `);
    
    res.json({ success: true, assignments: result.rows });
  } catch (err) {
    console.error('Fetch assignments error:', err);
    return res.json({ success: false, message: 'Error fetching assignments' });
  }
});

// Download assignment file
app.get('/api/admin/assignment/:studentId/:week/download', async (req, res) => {
  if (!req.session.adminId) return res.status(401).json({ success: false, message: 'Not authorized' });
  
  const { studentId, week } = req.params;
  
  try {
    const result = await db.query('SELECT assignment_file FROM progress WHERE student_id = $1 AND week = $2', [studentId, week]);
    const fileName = result.rows[0]?.assignment_file;
    
    if (!fileName) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    
    const filePath = path.join(uploadDir, fileName);
    res.download(filePath, fileName);
  } catch (err) {
    console.error('Download assignment error:', err);
    return res.status(500).json({ success: false, message: 'Error downloading file' });
  }
});

// Reject assignment
app.post('/api/admin/reject-assignment', async (req, res) => {
  if (!req.session.adminId) return res.json({ success: false, message: 'Not authorized' });
  
  const { studentId, week, feedback } = req.body;
  
  try {
    await db.query('UPDATE progress SET assignment_submitted = FALSE, approved = FALSE, feedback = $1 WHERE student_id = $2 AND week = $3',
      [feedback || 'Assignment rejected. Please resubmit.', studentId, week]);
    
    res.json({ success: true, message: 'Assignment rejected' });
  } catch (err) {
    console.error('Reject assignment error:', err);
    return res.json({ success: false, message: 'Error rejecting assignment' });
  }
});

// Reject video progress
app.post('/api/admin/reject-video', async (req, res) => {
  if (!req.session.adminId) return res.json({ success: false, message: 'Not authorized' });
  
  const { studentId, week, feedback } = req.body;
  
  try {
    await db.query('UPDATE progress SET video_watched = FALSE, video_progress = 0, feedback = $1 WHERE student_id = $2 AND week = $3',
      [feedback || 'Video progress rejected. Please rewatch the video.', studentId, week]);
    
    res.json({ success: true, message: 'Video progress rejected' });
  } catch (err) {
    console.error('Reject video error:', err);
    return res.json({ success: false, message: 'Error rejecting video progress' });
  }
});

app.get('/api/course-content', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM course_content ORDER BY week');
    res.json({ success: true, content: result.rows });
  } catch (err) {
    console.error('Fetch course content error:', err);
    return res.json({ success: false, message: 'Error fetching content' });
  }
});

// Admin routes
app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  
  console.log('Admin login attempt:', email);
  
  try {
    const result = await db.query('SELECT * FROM admins WHERE email = $1', [email]);
    console.log('Admin query result:', result.rows.length);
    
    const admin = result.rows[0];
    
    if (!admin) {
      console.log('Admin not found');
      return res.json({ success: false, message: 'Invalid credentials' });
    }
    
    console.log('Admin found, checking password');
    const validPassword = await bcrypt.compare(password, admin.password);
    console.log('Password valid:', validPassword);
    
    if (!validPassword) {
      return res.json({ success: false, message: 'Invalid credentials' });
    }
    
    req.session.adminId = admin.id;
    console.log('Admin session set:', req.session.adminId);
    
    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.json({ success: false, message: 'Session error' });
      }
      console.log('Admin login successful, session saved');
      res.json({ success: true, message: 'Admin login successful' });
    });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.json({ success: false, message: 'Database error: ' + err.message });
  }
});

app.get('/admin', (req, res) => {
  console.log('Admin dashboard access - Session adminId:', req.session.adminId);
  if (!req.session.adminId) {
    console.log('No admin session, redirecting to admin-access');
    return res.redirect('/admin-access');
  }
  console.log('Admin session valid, serving dashboard');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/admin/session-check', (req, res) => {
  console.log('Session check - adminId:', req.session.adminId);
  console.log('Full session:', req.session);
  res.json({ 
    adminId: req.session.adminId || null,
    sessionExists: !!req.session.adminId 
  });
});

app.get('/api/admin/students', async (req, res) => {
  console.log('Admin students request - Session adminId:', req.session.adminId);
  if (!req.session.adminId) return res.json({ success: false, message: 'Not authorized' });
  
  try {
    const result = await db.query(`SELECT s.id, s.name, s.email, s.created_at,
      COALESCE(COUNT(CASE WHEN p.approved = TRUE THEN 1 END), 0) as approved
      FROM students s 
      LEFT JOIN progress p ON s.id = p.student_id 
      GROUP BY s.id, s.name, s.email, s.created_at
      ORDER BY s.created_at DESC`);
    
    console.log('Students found:', result.rows.length);
    res.json({ success: true, students: result.rows || [] });
  } catch (err) {
    console.error('Database error in /api/admin/students:', err);
    return res.json({ success: false, message: 'Error fetching students' });
  }
});

app.get('/api/admin/analytics', async (req, res) => {
  if (!req.session.adminId) return res.json({ success: false, message: 'Not authorized' });
  
  try {
    const result = await db.query(`SELECT 
      COUNT(DISTINCT s.id) as total_students,
      AVG(p.video_progress) as avg_completion,

      SUM(p.time_spent) as total_time_spent,
      COUNT(CASE WHEN p.assignment_submitted = TRUE THEN 1 END) as total_submissions
      FROM students s 
      LEFT JOIN progress p ON s.id = p.student_id`);
    
    res.json({ success: true, analytics: result.rows[0] });
  } catch (err) {
    console.error('Analytics error:', err);
    return res.json({ success: false, message: 'Error fetching analytics' });
  }
});

app.get('/api/admin/student/:id', async (req, res) => {
  if (!req.session.adminId) {
    return res.json({ success: false, message: 'Not authorized' });
  }
  
  const studentId = req.params.id;
  
  try {
    const result = await db.query(`SELECT p.*, s.name as student_name FROM progress p 
      JOIN students s ON p.student_id = s.id 
      WHERE p.student_id = $1 ORDER BY p.week`, [studentId]);
    
    res.json({ success: true, progress: result.rows });
  } catch (err) {
    console.error('Student progress error:', err);
    return res.json({ success: false, message: 'Error fetching progress' });
  }
});

app.post('/api/admin/approve', async (req, res) => {
  if (!req.session.adminId) {
    return res.json({ success: false, message: 'Not authorized' });
  }
  
  const { studentId, week, feedback } = req.body;
  
  try {
    await db.query('UPDATE progress SET approved = TRUE, feedback = $1 WHERE student_id = $2 AND week = $3',
      [feedback || '', studentId, week]);
    
    res.json({ success: true, message: 'Assignment approved' });
  } catch (err) {
    console.error('Approve assignment error:', err);
    return res.json({ success: false, message: 'Error approving assignment' });
  }
});

app.post('/api/admin/batch-approve', async (req, res) => {
  if (!req.session.adminId) {
    return res.json({ success: false, message: 'Not authorized' });
  }
  
  const { approvals } = req.body; // Array of {studentId, week, feedback}
  
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const approval of approvals) {
      await client.query('UPDATE progress SET approved = TRUE, feedback = $1 WHERE student_id = $2 AND week = $3',
        [approval.feedback || '', approval.studentId, approval.week]);
    }
    
    await client.query('COMMIT');
    res.json({ success: true, message: `Approved ${approvals.length} assignments` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Batch approval error:', err);
    return res.json({ success: false, message: 'Batch approval failed' });
  } finally {
    client.release();
  }
});

// Admin content management
app.get('/api/admin/content', async (req, res) => {
  console.log('Admin content request - Session adminId:', req.session.adminId);
  if (!req.session.adminId) return res.json({ success: false, message: 'Not authorized' });
  
  try {
    const result = await db.query('SELECT * FROM course_content ORDER BY week');
    console.log('Content found:', result.rows.length, 'weeks');
    res.json({ success: true, content: result.rows });
  } catch (err) {
    console.error('Fetch content error:', err);
    return res.json({ success: false, message: 'Error fetching content' });
  }
});

app.get('/api/admin/content/:week', async (req, res) => {
  if (!req.session.adminId) return res.json({ success: false, message: 'Not authorized' });
  
  const week = req.params.week;
  
  try {
    const result = await db.query('SELECT * FROM course_content WHERE week = $1', [week]);
    console.log('Fetched content for week', week, ':', result.rows[0]);
    res.json({ success: true, content: result.rows[0] });
  } catch (err) {
    console.error('Fetch content by week error:', err);
    return res.json({ success: false, message: 'Error fetching content' });
  }
});

app.post('/api/admin/content', async (req, res) => {
  if (!req.session.adminId) return res.json({ success: false, message: 'Not authorized' });
  
  const { week, title, description, videoId, courseDescription, logoUrl } = req.body;
  const videoIds = req.body.videoIds || videoId; // Support both single and multiple videos
  
  console.log('Received content update request:', {
    week, title, description, videoId, videoIds, 
    assignmentQuestion: req.body.assignmentQuestion, 
    imageIcon: req.body.imageIcon
  });
  
  try {
    // Check if this is a new week or existing week
    if (req.body.weekNumber) {
      // New week
      const weekNumber = req.body.weekNumber;
      await db.query('INSERT INTO course_content (week, title, description, videoId, videoIds, courseDescription, logoUrl, assignmentQuestion, imageIcon) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [weekNumber, title, description, videoId, videoIds, courseDescription, logoUrl, req.body.assignmentQuestion, req.body.imageIcon]);
      
      // Initialize progress for all students for this new week
      const studentsResult = await db.query('SELECT id FROM students');
      for (const student of studentsResult.rows) {
        await db.query('INSERT INTO progress (student_id, week) VALUES ($1, $2)', [student.id, weekNumber]);
      }
      
      console.log('New content created for week:', weekNumber);
      res.json({ success: true, message: 'Content created successfully' });
    } else {
      // Update existing week - only update videoIds, not videoId
      const updateResult = await db.query('UPDATE course_content SET title = $1, description = $2, videoIds = $3, assignmentQuestion = $4, imageIcon = $5 WHERE week = $6',
        [title, description, videoIds, req.body.assignmentQuestion, req.body.imageIcon, week]);
      
      console.log('Content updated for week:', week, 'Rows affected:', updateResult.rowCount);
      res.json({ success: true, message: 'Content updated successfully' });
    }
  } catch (err) {
    console.error('Content management error:', err);
    if (err.code === '23505') { // Unique constraint violation
      return res.json({ success: false, message: 'Week already exists' });
    }
    return res.json({ success: false, message: 'Error managing content' });
  }
});



// Delete student endpoint
app.delete('/api/admin/student/:id', async (req, res) => {
  if (!req.session.adminId) return res.json({ success: false, message: 'Not authorized' });
  
  const studentId = req.params.id;
  
  try {
    // Delete student progress first, then student
    await db.query('DELETE FROM progress WHERE student_id = $1', [studentId]);
    const result = await db.query('DELETE FROM students WHERE id = $1 RETURNING name', [studentId]);
    
    if (result.rows.length > 0) {
      res.json({ success: true, message: `Student ${result.rows[0].name} deleted successfully` });
    } else {
      res.json({ success: false, message: 'Student not found' });
    }
  } catch (err) {
    console.error('Delete student error:', err);
    return res.json({ success: false, message: 'Error deleting student' });
  }
});

// Delete all students endpoint
app.delete('/api/admin/students/all', async (req, res) => {
  if (!req.session.adminId) return res.json({ success: false, message: 'Not authorized' });
  
  try {
    await db.query('DELETE FROM progress');
    await db.query('DELETE FROM students');
    
    res.json({ success: true, message: 'All students deleted successfully' });
  } catch (err) {
    console.error('Delete all students error:', err);
    return res.json({ success: false, message: 'Error deleting students' });
  }
});

// Delete content endpoint
app.delete('/api/admin/content/:week', async (req, res) => {
  if (!req.session.adminId) return res.json({ success: false, message: 'Not authorized' });
  
  const week = req.params.week;
  
  try {
    await db.query('DELETE FROM course_content WHERE week = $1', [week]);
    res.json({ success: true, message: 'Week content deleted successfully' });
  } catch (err) {
    console.error('Delete content error:', err);
    return res.json({ success: false, message: 'Error deleting content' });
  }
});

// Add new content endpoint
app.post('/api/admin/content/new', async (req, res) => {
  if (!req.session.adminId) return res.json({ success: false, message: 'Not authorized' });
  
  const { week, title, description, videoId, courseDescription, logoUrl, assignmentQuestion, imageIcon } = req.body;
  const videoIds = req.body.videoIds || videoId;
  
  try {
    await db.query('INSERT INTO course_content (week, title, description, videoId, videoIds, courseDescription, logoUrl, assignmentQuestion, imageIcon) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [week, title, description, videoId, videoIds, courseDescription, logoUrl, assignmentQuestion, imageIcon]);
    
    // Initialize progress for all students for this new week
    const studentsResult = await db.query('SELECT id FROM students');
    for (const student of studentsResult.rows) {
      await db.query('INSERT INTO progress (student_id, week) VALUES ($1, $2)', [student.id, week]);
    }
    
    res.json({ success: true, message: 'Content created successfully' });
  } catch (err) {
    console.error('Create content error:', err);
    if (err.code === '23505') { // Unique constraint violation
      return res.json({ success: false, message: 'Week already exists' });
    }
    return res.json({ success: false, message: 'Error creating content' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`\n🎓 CFi Ideation Team LMS Server running on port ${PORT}`);
  console.log('📚 Course: 8-Week Administrative Toolkit');
  console.log('🔑 Admin login: cfi.ideation@gmail.com / admintoolkit');
  console.log('🚀 Ready for students to register and learn!\n');
});

module.exports = app;