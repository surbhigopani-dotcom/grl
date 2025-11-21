#!/usr/bin/env node

/**
 * Setup script to create .env file from env.example.txt
 * Run this on your server: node setup-env.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envExamplePath = path.join(__dirname, 'env.example.txt');
const envPath = path.join(__dirname, '.env');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists!');
  console.log(`   Location: ${envPath}`);
  console.log('   If you want to recreate it, delete it first and run this script again.');
  process.exit(0);
}

// Check if env.example.txt exists
if (!fs.existsSync(envExamplePath)) {
  console.error('❌ env.example.txt not found!');
  console.error(`   Expected at: ${envExamplePath}`);
  process.exit(1);
}

// Read the example file
let envContent = fs.readFileSync(envExamplePath, 'utf8');

// Generate a secure JWT_SECRET if it's still the default value
if (envContent.includes('JWT_SECRET=your_super_secret_jwt_key_change_this_in_production')) {
  const jwtSecret = crypto.randomBytes(32).toString('hex');
  envContent = envContent.replace(
    'JWT_SECRET=your_super_secret_jwt_key_change_this_in_production',
    `JWT_SECRET=${jwtSecret}`
  );
  console.log('✅ Generated a secure JWT_SECRET');
}

// Remove comments and instructions (lines starting with #)
// But keep the actual variable definitions
const lines = envContent.split('\n');
const envLines = lines.filter(line => {
  const trimmed = line.trim();
  // Keep non-empty lines that are either:
  // 1. Not comments (don't start with #)
  // 2. Or are variable definitions (contain =)
  return trimmed && (!trimmed.startsWith('#') || trimmed.includes('='));
});

// Write the .env file
fs.writeFileSync(envPath, envLines.join('\n') + '\n', 'utf8');

console.log('✅ .env file created successfully!');
console.log(`   Location: ${envPath}`);
console.log('');
console.log('📝 Next steps:');
console.log('   1. Review the .env file and update any values if needed');
console.log('   2. Make sure all Firebase environment variables are set');
console.log('   3. Restart your PM2 process: pm2 restart backend');
console.log('');
console.log('🔒 Security reminder:');
console.log('   - Never commit .env to git (it should be in .gitignore)');
console.log('   - Keep your credentials secure');




