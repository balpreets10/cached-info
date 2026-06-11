#!/usr/bin/env node

/**
 * Configuration Validation Script
 * Run this to check if your environment is properly configured
 * 
 * Usage: node setup-check.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking React App Configuration...\n');

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
const envExists = fs.existsSync(envPath);

console.log(`📁 .env file: ${envExists ? '✅ Found' : '❌ Not found'}`);

if (!envExists) {
    console.log('\n❌ Please create a .env file in your project root with:');
    console.log('REACT_APP_SUPABASE_URL=https://your-project.supabase.co');
    console.log('REACT_APP_SUPABASE_ANON_KEY=your-anon-key');
    process.exit(1);
}

// Read and validate .env contents
const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

let supabaseUrl = '';
let supabaseKey = '';

lines.forEach(line => {
    const [key, value] = line.split('=');
    if (key === 'REACT_APP_SUPABASE_URL') {
        supabaseUrl = value;
    }
    if (key === 'REACT_APP_SUPABASE_ANON_KEY') {
        supabaseKey = value;
    }
});

console.log('\n📝 Environment Variables:');

// Check Supabase URL
if (!supabaseUrl) {
    console.log('REACT_APP_SUPABASE_URL: ❌ Missing');
} else if (supabaseUrl === 'your_supabase_project_url') {
    console.log('REACT_APP_SUPABASE_URL: ❌ Still has placeholder value');
} else if (!supabaseUrl.includes('supabase.co')) {
    console.log('REACT_APP_SUPABASE_URL: ⚠️  Might be invalid (should contain "supabase.co")');
} else {
    console.log('REACT_APP_SUPABASE_URL: ✅ Configured');
}

// Check Supabase Key
if (!supabaseKey) {
    console.log('REACT_APP_SUPABASE_ANON_KEY: ❌ Missing');
} else if (supabaseKey === 'your_supabase_anon_key') {
    console.log('REACT_APP_SUPABASE_ANON_KEY: ❌ Still has placeholder value');
} else if (!supabaseKey.startsWith('eyJ')) {
    console.log('REACT_APP_SUPABASE_ANON_KEY: ⚠️  Might be invalid (JWT tokens start with "eyJ")');
} else {
    console.log('REACT_APP_SUPABASE_ANON_KEY: ✅ Configured');
}

// Check required files
console.log('\n📚 Required Files:');

const requiredFiles = [
    'src/context/DataContext.jsx',
    'src/context/AuthContext.jsx',
    'src/supabaseClient.js',
    'src/pages/HomePage.jsx',
    'src/App.jsx',
    'package.json'
];

requiredFiles.forEach(file => {
    const exists = fs.existsSync(path.join(process.cwd(), file));
    console.log(`${file}: ${exists ? '✅' : '❌'}`);
});

// Check package.json dependencies
console.log('\n📦 Dependencies:');

const packagePath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const requiredDeps = [
        '@supabase/supabase-js',
        'react',
        'react-router-dom'
    ];

    requiredDeps.forEach(dep => {
        console.log(`${dep}: ${deps[dep] ? '✅ ' + deps[dep] : '❌ Missing'}`);
    });
} else {
    console.log('package.json: ❌ Not found');
}

// Test Supabase connection
console.log('\n🔌 Testing Connection...');

if (supabaseUrl && supabaseKey &&
    supabaseUrl !== 'your_supabase_project_url' &&
    supabaseKey !== 'your_supabase_anon_key') {

    console.log('Configuration looks good! Start your app to test the database connection.');
    console.log('\nNext steps:');
    console.log('1. Run: npm start');
    console.log('2. Check browser console for connection status');
    console.log('3. Press Ctrl+Shift+D on homepage for debug info');
} else {
    console.log('\n❌ Configuration incomplete. Please update your .env file with actual Supabase credentials.');
    console.log('\nGet your credentials from: https://supabase.com/dashboard');
    console.log('→ Select your project → Settings → API');
}

console.log('\n✨ Setup check complete!\n');

// Exit codes
if (!supabaseUrl || !supabaseKey ||
    supabaseUrl === 'your_supabase_project_url' ||
    supabaseKey === 'your_supabase_anon_key') {
    process.exit(1);
} else {
    process.exit(0);
}