# WingBoard System Patterns

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         React Native App (Expo)        │
│  ┌──────────┐  ┌──────────┐           │
│  │  Queen   │  │  Crew    │  │ Match │
│  │Dashboard │  │  Room    │  │  Chat │
│  └──────────┘  └──────────┘  └───────┘
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│          Supabase Backend               │
│  ┌──────────┐  ┌──────────┐  ┌──────┐ │
│  │   Auth   │  │ Realtime │  │Storage││
│  └──────────┘  └──────────┘  └──────┘ │
│  ┌────────────────────────────────────┐ │
│  │      PostgreSQL Database           │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│        External Services                │
│  ┌──────────┐  ┌──────────┐           │
│  │  Twilio  │  │  Push    │           │
│  │   SMS    │  │  Notifs  │           │
│  └──────────┘  └──────────┘           │
└─────────────────────────────────────────┘
```

## Data Model

### Core Entities

**Users**
- `id` (UUID, primary key)
- `phone` (unique, for auth)
- `name`
- `role` (queen, crew, match)
- `gender` (for swiping rules)
- `created_at`, `updated_at`

**Queens**
- `user_id` (FK to users)
- `bio` (current approved bio)
- `crew_formed` (boolean)
- `mute_crew` (boolean)
- `blur_mode` (boolean, default true)

**Crews**
- `id` (UUID)
- `queen_id` (FK to queens)
- `crew_member_1_id` (FK to users)
- `crew_member_2_id` (FK to users)
- `crew_member_3_id` (FK to users)
- `status` (pending, active, inactive)
- `created_at`

**Crew Members**
- `crew_id` (FK to crews)
- `user_id` (FK to users)
- `role` (member_1, member_2, member_3)
- `voice_mode` (funny, serious)
- `joined_at`

**Matches**
- `id` (UUID)
- `queen_id` (FK to queens)
- `match_user_id` (FK to users - the matched person)
- `status` (pending_approval, approved, rejected)
- `matched_at`, `approved_at`

**Profiles** (for swiping)
- `user_id` (FK to users)
- `photos` (array of photo URLs)
- `age`
- `location`
- `bio`
- `created_at`, `updated_at`

**Chats**
- `id` (UUID)
- `match_id` (FK to matches)
- `queen_id` (FK to queens)
- `match_user_id` (FK to users)
- `created_at`, `updated_at`

**Messages**
- `id` (UUID)
- `chat_id` (FK to chats)
- `sender_id` (FK to users)
- `sender_type` (queen, crew_member, match)
- `crew_member_name` (nullable, for signed crew messages)
- `voice_mode` (nullable, funny/serious for crew)
- `content` (text)
- `emoji_reactions` (JSONB: {user_id: emoji})
- `is_crew_takeover` (boolean)
- `created_at`

**Swipe Decisions**
- `id` (UUID)
- `queen_id` (FK to queens)
- `profile_id` (FK to profiles)
- `crew_member_id` (FK to users)
- `decision` (like, pass)
- `created_at`

**Bio Proposals**
- `id` (UUID)
- `queen_id` (FK to queens)
- `proposed_by` (FK to users - crew member)
- `proposed_bio` (text)
- `votes` (JSONB: {user_id: emoji})
- `status` (pending, approved, rejected)
- `created_at`

**Date Proposals**
- `id` (UUID)
- `match_id` (FK to matches)
- `proposed_by` (FK to users - crew member)
- `proposed_time` (timestamp)
- `proposed_location` (text)
- `votes` (JSONB: {user_id: emoji})
- `queen_status` (pending, accepted, rejected)
- `match_status` (pending, accepted, rejected)
- `status` (pending, locked, rejected)
- `created_at`

**Crew Invites**
- `id` (UUID)
- `queen_id` (FK to queens)
- `invite_token` (unique token)
- `phone` (invited phone number)
- `status` (pending, accepted, expired)
- `expires_at`, `created_at`

## Design Patterns

### Real-time Updates
- Use Supabase Realtime subscriptions for:
  - Chat messages
  - Emoji reactions
  - Swipe decisions (live vote counts)
  - Date proposal status
  - Crew actions (takeovers)

### Vote/Aggregation Pattern
- Swipes, bio proposals, date proposals use JSONB votes
- Calculate majority in real-time using Supabase functions
- Trigger actions when majority reached

### Role-Based Access Control (RBAC)
- Supabase Row Level Security (RLS) policies:
  - Queens see their dashboard data
  - Crew see their crew's data only
  - Matches see their match chats only
  - No overlap: Crew members cannot be matches

### Event-Driven Actions
- Crew member swipes → update swipe decision → check majority → create match if needed
- Bio proposal vote → check majority → auto-lock if 🔥 majority
- Date proposal vote → check majority → send to Queen + Match

### State Management Pattern
- Redux Toolkit or Zustand for:
  - User session/auth state
  - Current matches
  - Active chats
  - Crew room state
- Supabase Realtime for live data sync

## API Patterns

### Supabase Client Pattern
```javascript
// Single Supabase client instance
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Real-time subscription pattern
supabase
  .channel('chat-messages')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => handleNewMessage(payload.new)
  )
  .subscribe()
```

### Authentication Flow
1. Phone number entry → Supabase Auth sends OTP
2. OTP verification → Session created
3. Check user role → Route to appropriate screen

### Crew Invite Flow
1. Queen generates invite token → Store in `crew_invites` table
2. Send SMS via Twilio with deep link: `wingboard://invite/{token}`
3. Friend taps link → App opens → Verify token → Join crew

## Component Patterns

### Screen Structure
- **Navigation**: React Navigation (Stack + Tab navigators)
- **Queens**: Dashboard (home), Chat screens, Settings
- **Crew**: Crew Room (tabs), Individual tool screens
- **Matches**: Chat screen (shared with Queens)

### Reusable Components
- `EmojiPicker` - For reactions and votes
- `CrewMessage` - Signed crew message display
- `SwipeCard` - Profile card for swiping
- `DateProposalCard` - Date proposal display
- `VoteIndicator` - Live vote count display

## Security Patterns

### Data Privacy
- Blur mode: Client-side redaction before crew sees chats
- RLS policies ensure data isolation
- Crew members cannot access match profiles

### Authentication
- Phone-only auth (Supabase Phone Auth)
- JWT tokens for session management
- Token refresh handled automatically

### Input Validation
- Sanitize all user inputs
- Validate emoji reactions (whitelist only)
- Rate limit crew actions (10 swipes/day)

## Performance Patterns

### Real-time Optimization
- Subscribe only to active channels
- Unsubscribe on screen unmount
- Batch vote updates (debounce)

### Image Handling
- Supabase Storage for profile photos
- Optimize images on upload
- Lazy load in swipe feed

### Offline Support
- Queue actions when offline
- Sync on reconnect
- Cache recent matches/chats
