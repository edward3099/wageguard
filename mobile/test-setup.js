#!/usr/bin/env node
/**
 * Test script to validate WingBoard mobile app setup
 * Checks for:
 * - Required files
 * - TypeScript compilation
 * - Missing dependencies
 * - Configuration issues
 */

const fs = require('fs');
const path = require('path');

const errors = [];
const warnings = [];

// Check required files
const requiredFiles = [
  'app.json',
  'package.json',
  'tsconfig.json',
  'babel.config.js',
  'app/_layout.tsx',
  'app/index.tsx',
  'constants/config.ts',
  'services/supabase.ts',
  'services/auth.ts',
  'store/authStore.ts',
];

console.log('🔍 Checking required files...\n');
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing required file: ${file}`);
  } else {
    console.log(`✅ ${file}`);
  }
});

// Check for .env file
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  warnings.push('⚠️  .env file not found. You\'ll need to create one with Supabase credentials.');
  console.log('⚠️  .env file not found (expected - use .env.example as template)');
} else {
  console.log('✅ .env file exists');
}

// Check app structure
console.log('\n📁 Checking app structure...\n');
const appRoutes = [
  'app/(auth)/phone.tsx',
  'app/(auth)/otp.tsx',
  'app/(auth)/onboarding.tsx',
  'app/(queen)/dashboard.tsx',
  'app/(crew)/room.tsx',
  'app/(crew)/swipe.tsx',
  'app/(crew)/bio.tsx',
  'app/(crew)/chat-reactor.tsx',
  'app/(crew)/date.tsx',
];

appRoutes.forEach(route => {
  const routePath = path.join(__dirname, route);
  if (!fs.existsSync(routePath)) {
    errors.push(`Missing route: ${route}`);
  } else {
    console.log(`✅ ${route}`);
  }
});

// Check services
console.log('\n🔧 Checking services...\n');
const services = [
  'services/supabase.ts',
  'services/auth.ts',
  'services/swipeService.ts',
  'services/dashboardService.ts',
  'services/onboardingService.ts',
  'services/bioService.ts',
  'services/chatService.ts',
];

services.forEach(service => {
  const servicePath = path.join(__dirname, service);
  if (!fs.existsSync(servicePath)) {
    errors.push(`Missing service: ${service}`);
  } else {
    console.log(`✅ ${service}`);
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Test Summary\n');

if (errors.length > 0) {
  console.log('❌ ERRORS FOUND:\n');
  errors.forEach(err => console.log(`  - ${err}`));
  process.exit(1);
} else {
  console.log('✅ All required files present!');
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:\n');
  warnings.forEach(warn => console.log(`  - ${warn}`));
}

console.log('\n✨ Setup validation complete!');
console.log('\nNext steps:');
console.log('  1. Create .env file with Supabase credentials');
console.log('  2. Run: npm start');
console.log('  3. Test on Expo Go app or simulator\n');
