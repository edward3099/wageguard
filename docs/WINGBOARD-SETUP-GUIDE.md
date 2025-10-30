# WingBoard Setup Guide

This guide will walk you through setting up WingBoard from scratch.

## Prerequisites

- Node.js 18+ installed
- Expo account (free)
- Supabase account (free tier works)
- Twilio account (for SMS - optional for development)

## Step 1: Install Dependencies

```bash
cd mobile
npm install
```

## Step 2: Set Up Supabase

### 2.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose organization and fill in:
   - Name: `wingboard`
   - Database Password: (save this!)
   - Region: Choose closest to you
4. Wait for project to be created (~2 minutes)

### 2.2 Get Your Credentials

In Supabase Dashboard:
1. Go to Settings > API
2. Copy:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - `anon` `public` key

### 2.3 Run Database Migrations

**Option A: Via Supabase Dashboard (Easiest)**
1. Go to SQL Editor in Supabase Dashboard
2. Click "New Query"
3. Open `supabase/migrations/001_initial_schema.sql`
4. Copy entire contents
5. Paste into SQL Editor
6. Click "Run" (or press Cmd/Ctrl + Enter)
7. Verify no errors

**Option B: Via Supabase CLI**
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### 2.4 Enable Phone Authentication

1. Go to Authentication > Providers
2. Enable "Phone" provider
3. For development, you can use Supabase's test SMS (limited)
4. For production, configure Twilio (see Step 4)

### 2.5 Enable Realtime

1. Go to Database > Replication
2. Enable replication for these tables:
   - `messages`
   - `swipe_decisions`
   - `bio_proposals`
   - `date_proposals`
   - `matches`

### 2.6 Set Up Storage

1. Go to Storage
2. Click "New Bucket"
3. Name: `profile-photos`
4. Public bucket: ✅ Yes
5. File size limit: 5MB
6. Allowed MIME types: `image/*`

## Step 3: Configure Environment Variables

```bash
cd mobile
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4: Set Up Twilio (Optional for Development)

For SMS invites, you'll need Twilio:

1. Sign up at [twilio.com](https://twilio.com)
2. Get a phone number
3. Note your credentials:
   - Account SID
   - Auth Token
   - Phone Number

Add to `.env`:
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**Note**: For MVP development, you can skip Twilio and use deep links directly.

## Step 5: Install Expo Go App

On your phone:
- **iOS**: Install "Expo Go" from App Store
- **Android**: Install "Expo Go" from Google Play

## Step 6: Start Development Server

```bash
cd mobile
npm start
```

This will:
1. Start Metro bundler
2. Show QR code in terminal
3. Open Expo DevTools in browser

### Run on Device

1. Open Expo Go app on your phone
2. Scan QR code from terminal
3. App will load (may take 30-60 seconds first time)

### Run on Simulator

**iOS:**
```bash
npm run ios
```

**Android:**
```bash
npm run android
```

(Requires Xcode/iOS Simulator or Android Studio installed)

## Step 7: Test Authentication

1. App should open to phone input screen
2. Enter phone number (use test number if using Supabase test SMS)
3. Enter OTP code
4. Should route to appropriate screen based on role

## Step 8: Create Test Data (Optional)

You can create test users directly in Supabase:

1. Go to SQL Editor
2. Run this SQL (adjust phone numbers):

```sql
-- Create test Queen
INSERT INTO users (id, phone, name, role, gender) VALUES
  ('00000000-0000-0000-0000-000000000001', '+1234567890', 'Test Queen', 'queen', 'female');

INSERT INTO queens (user_id, bio) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Test bio - swipe right!');

-- Create test Crew
INSERT INTO users (id, phone, name, role, gender) VALUES
  ('00000000-0000-0000-0000-000000000002', '+1234567891', 'Crew 1', 'crew', 'male'),
  ('00000000-0000-0000-0000-000000000003', '+1234567892', 'Crew 2', 'crew', 'female'),
  ('00000000-0000-0000-0000-000000000004', '+1234567893', 'Crew 3', 'crew', 'male');

-- Create crew
INSERT INTO crews (queen_id, crew_member_1_id, crew_member_2_id, crew_member_3_id, status) VALUES
  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000004',
   'active');
```

## Troubleshooting

### "Cannot connect to Supabase"
- Check `.env` file has correct URL and key
- Verify Supabase project is active
- Check network connection

### "RLS Policy Error"
- Verify RLS policies are enabled in Supabase Dashboard
- Check that `auth.uid()` function exists
- Review migration file ran successfully

### "Realtime not working"
- Verify replication enabled in Database > Replication
- Check channel subscriptions in code
- Review Supabase Realtime status

### "Expo Go not loading"
- Clear Expo Go cache
- Restart Metro bundler (`npm start -- --clear`)
- Check Expo CLI version: `expo --version`

### "TypeScript errors"
- Run `npm install` again
- Check `tsconfig.json` is correct
- Restart TypeScript server in editor

## Next Steps

After setup:
1. ✅ Test phone authentication
2. ✅ Test crew invite flow
3. ✅ Test real-time updates
4. ✅ Test swipe/vote flows
5. Review [Implementation Plan](wingboard-implementation-plan.md) for feature development

## Getting Help

- Check [Supabase Docs](https://supabase.com/docs)
- Check [Expo Docs](https://docs.expo.dev)
- Review `memory-bank/` for project context
- Check error messages carefully

## Production Deployment

When ready for production:

1. **Build App**
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS/Android
eas build --platform ios
eas build --platform android
```

2. **Update Supabase**
- Use production Supabase project
- Update environment variables
- Configure production SMS provider

3. **App Store Submission**
- Prepare app icons and screenshots
- Write app descriptions
- Submit to App Store/Play Store

Good luck! 🚀
