// Comprehensive LMS Functionality Test
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

console.log('🧪 Starting LMS Functionality Test...\n');

// Test database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runTests() {
    try {
        // Test 1: Database Tables
        console.log('✅ Test 1: Database Tables');
        await testDatabaseTables();
        
        // Test 2: Admin Account
        console.log('✅ Test 2: Admin Account');
        await testAdminAccount();
        
        // Test 3: Sample Data
        console.log('✅ Test 3: Sample Data');
        await testSampleData();
        
        // Test 4: File Structure
        console.log('✅ Test 4: File Structure');
        await testFileStructure();
        
        console.log('\n🎉 All tests passed! LMS is ready to use.');
        console.log('\n📋 Quick Start:');
        console.log('1. Set DATABASE_URL environment variable');
        console.log('2. Run: npm start');
        console.log('3. Open: http://localhost:3000');
        console.log('4. Admin login: cfi.ideation@gmail.com / admintoolkit');
        console.log('5. Register students and start learning!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await db.end();
    }
}

async function testDatabaseTables() {
    const tables = ['students', 'progress', 'admins', 'quizzes', 'course_content'];
    
    for (const table of tables) {
        const result = await db.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`, [table]);
        if (!result.rows[0].exists) {
            throw new Error(`Table ${table} not found`);
        }
        console.log(`   ✓ Table '${table}' exists`);
    }
}

async function testAdminAccount() {
    const result = await db.query('SELECT * FROM admins WHERE email = $1', ['cfi.ideation@gmail.com']);
    const admin = result.rows[0];
    
    if (!admin) {
        throw new Error('Admin account not found');
    }
    
    const validPassword = await bcrypt.compare('admintoolkit', admin.password);
    if (!validPassword) {
        throw new Error('Admin password incorrect');
    }
    
    console.log('   ✓ Admin account exists with correct credentials');
}

async function testSampleData() {
    const result = await db.query('SELECT COUNT(*) as count FROM quizzes');
    const count = parseInt(result.rows[0].count);
    
    if (count < 10) {
        throw new Error('Not enough quiz questions');
    }
    
    console.log(`   ✓ ${count} quiz questions available`);
}

async function testFileStructure() {
    const fs = require('fs');
    const requiredFiles = [
        'server.js',
        'package.json',
        'public/index.html',
        'public/dashboard.html',
        'public/admin.html',
        'public/script.js',
        'public/dashboard.js',
        'public/admin.js',
        'public/style.css',
        'uploads'
    ];
    
    requiredFiles.forEach(file => {
        const path = require('path').join(__dirname, file);
        if (!fs.existsSync(path)) {
            throw new Error(`Required file/folder missing: ${file}`);
        }
        console.log(`   ✓ ${file} exists`);
    });
}

runTests();