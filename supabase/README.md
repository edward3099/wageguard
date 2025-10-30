# WingBoard Supabase Setup

This directory contains database migrations and configuration for WingBoard's Supabase backend.

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### 2. Run Migrations

#### Option A: Via Supabase Dashboard
1. Go to SQL Editor in Supabase Dashboard
2. Copy contents of `migrations/001_initial_schema.sql`
3. Paste and run in SQL Editor

#### Option B: Via Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### 3. Configure Authentication

1. Go to Authentication > Providers in Supabase Dashboard
2. Enable Phone provider
3. Configure SMS provider (Twilio recommended)
4. Set up Twilio credentials

### 4. Enable Realtime

1. Go to Database > Replication in Supabase Dashboard
2. Enable replication for:
   - `messages`
   - `swipe_decisions`
   - `bio_proposals`
   - `date_proposals`
   - `matches`

### 5. Set Up Storage

1. Go to Storage in Supabase Dashboard
2. Create bucket: `profile-photos`
3. Set policies:
   - Public read
   - Authenticated write

### 6. Configure Row Level Security

RLS policies are already defined in the migration file. Verify they're active:
- Go to Database > Tables
- Check each table has RLS enabled
- Review policies in Authentication > Policies

## Environment Variables

Add these to your `.env` file:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Backend only
```

## Database Schema Overview

### Core Tables
- `users` - All app users
- `queens` - Queen-specific data
- `crews` - Crew groups (max 3 members)
- `crew_members` - Crew membership metadata
- `profiles` - User profiles for swiping
- `matches` - Matches between Queens and users
- `chats` - Chat conversations
- `messages` - Individual messages with crew takeovers
- `swipe_decisions` - Crew swipe votes
- `bio_proposals` - Bio edit proposals with voting
- `date_proposals` - Date proposals with voting
- `crew_invites` - Invite tokens for crew joining

### Key Features
- Automatic match creation when swipe majority reached
- Real-time vote counting
- RLS policies for data security
- Automatic timestamp updates
- Business logic functions for voting

## Testing

### Seed Data (Optional)

Create a seed file for testing:

```sql
-- Insert test users
INSERT INTO users (id, phone, name, role, gender) VALUES
  ('00000000-0000-0000-0000-000000000001', '+1234567890', 'Test Queen', 'queen', 'female'),
  ('00000000-0000-0000-0000-000000000002', '+1234567891', 'Crew Member 1', 'crew', 'male'),
  ('00000000-0000-0000-0000-000000000003', '+1234567892', 'Crew Member 2', 'crew', 'female'),
  ('00000000-0000-0000-0000-000000000004', '+1234567893', 'Crew Member 3', 'crew', 'male');

-- Insert test queen
INSERT INTO queens (user_id, bio) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Test bio');

-- Insert test crew
INSERT INTO crews (queen_id, crew_member_1_id, crew_member_2_id, crew_member_3_id, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000004',
   'active');
```

## Troubleshooting

### RLS Policy Issues
- Check that policies are correctly scoped
- Verify `auth.uid()` function works
- Test queries with authenticated user

### Realtime Not Working
- Verify replication is enabled in Dashboard
- Check channel subscriptions in code
- Review Supabase Realtime limits

### Migration Errors
- Check PostgreSQL version compatibility
- Verify extensions are available
- Review error messages for specific issues

## Next Steps

After setup:
1. Test authentication flow
2. Test RLS policies
3. Test real-time subscriptions
4. Load test data
5. Verify all triggers work
