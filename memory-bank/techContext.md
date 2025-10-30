# WingBoard Technical Context

## Technology Stack

### Frontend (Mobile)
- **Framework**: React Native (Expo)
- **Language**: TypeScript (preferred) / JavaScript
- **Navigation**: React Navigation v6
- **State Management**: Redux Toolkit or Zustand
- **UI Library**: React Native Paper or NativeBase
- **Forms**: React Hook Form
- **Animation**: React Native Reanimated
- **Image Handling**: Expo Image

### Backend & Database
- **BaaS**: Supabase
  - PostgreSQL database
  - Supabase Auth (phone authentication)
  - Supabase Realtime (WebSocket subscriptions)
  - Supabase Storage (profile photos)
  - Row Level Security (RLS) policies

### External Services
- **SMS**: Twilio (for crew invites)
- **Push Notifications**: Expo Notifications + Supabase
- **Deep Linking**: Expo Linking (for invite links)

### Development Tools
- **Package Manager**: npm or yarn
- **Type Checking**: TypeScript
- **Linting**: ESLint
- **Formatting**: Prettier
- **Version Control**: Git

## Development Environment Setup

### Prerequisites
```bash
# Required
- Node.js 18+
- npm or yarn
- Expo CLI: npm install -g expo-cli
- iOS Simulator (Mac) or Android Studio (all platforms)
- Supabase account
- Twilio account (for SMS)
```

### Project Structure
```
wingboard/
├── mobile/                    # React Native app
│   ├── app/                  # Expo Router or screens
│   ├── components/           # Reusable components
│   ├── services/             # API clients, Supabase
│   ├── store/               # State management
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Helper functions
│   ├── types/               # TypeScript types
│   └── constants/           # App constants
├── supabase/                # Supabase config
│   ├── migrations/          # Database migrations
│   ├── functions/           # Edge functions (if needed)
│   └── seed.sql             # Seed data
├── docs/                    # Documentation
└── scripts/                 # Utility scripts
```

## Supabase Configuration

### Environment Variables
```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Backend only

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number

# App Config
EXPO_PUBLIC_APP_URL=wingboard://
```

### Supabase Setup Steps
1. Create Supabase project
2. Enable Phone Auth in Supabase Dashboard
3. Configure RLS policies for all tables
4. Set up Storage buckets for profile photos
5. Enable Realtime for: messages, swipe_decisions, bio_proposals, date_proposals

## Database Schema

### Key Tables (see systemPatterns.md for full schema)
- `users` - All app users
- `queens` - Queen-specific data
- `crews` - Crew groups
- `crew_members` - Crew membership
- `matches` - Matches between Queens and users
- `chats` - Chat conversations
- `messages` - Individual messages
- `swipe_decisions` - Crew swipe votes
- `bio_proposals` - Bio edit proposals
- `date_proposals` - Date proposals
- `crew_invites` - Invite tokens

### Relationships
- Users can be: Queen (1:1), Crew Member (many:many), Match (many:many)
- Crew belongs to one Queen (1:1)
- Match connects Queen to Match User (many:many)
- Chat belongs to one Match (1:1)
- Messages belong to one Chat (many:1)

## Authentication Flow

### Phone Authentication (Supabase)
```javascript
// 1. Request OTP
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+1234567890',
  options: {
    channel: 'sms'
  }
})

// 2. Verify OTP
const { data, error } = await supabase.auth.verifyOtp({
  phone: '+1234567890',
  token: '123456',
  type: 'sms'
})

// 3. Get session
const { data: { session } } = await supabase.auth.getSession()
```

### Role Detection
- After auth, query `users` table to determine role
- Route to appropriate screen (Queen Dashboard vs Crew Room)

## Real-time Subscriptions

### Chat Messages
```javascript
const channel = supabase
  .channel('chat-messages')
  .on('postgres_changes', 
    { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'messages',
      filter: `chat_id=eq.${chatId}`
    },
    (payload) => {
      // Handle new message
    }
  )
  .subscribe()
```

### Swipe Decisions (Live Voting)
```javascript
const channel = supabase
  .channel('swipe-votes')
  .on('postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'swipe_decisions',
      filter: `queen_id=eq.${queenId}`
    },
    (payload) => {
      // Update vote counts
    }
  )
  .subscribe()
```

## API Patterns

### Supabase Client Setup
```javascript
// services/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})
```

### Query Patterns
```javascript
// Get Queen's matches
const { data: matches } = await supabase
  .from('matches')
  .select('*, match_user:users(*)')
  .eq('queen_id', queenId)
  .eq('status', 'approved')

// Get crew members
const { data: crew } = await supabase
  .from('crew_members')
  .select('*, user:users(*)')
  .eq('crew_id', crewId)

// Get chat messages with reactions
const { data: messages } = await supabase
  .from('messages')
  .select('*, sender:users(*)')
  .eq('chat_id', chatId)
  .order('created_at', { ascending: true })
```

## Deployment

### Mobile App
- **Development**: Expo Go app (test on device)
- **Staging**: Expo EAS Build (internal distribution)
- **Production**: App Store (iOS) + Google Play (Android)

### Supabase
- Hosted on Supabase Cloud
- Automatic backups enabled
- Monitor usage and scaling

### Environment Management
- Development: `.env.local`
- Staging: `.env.staging`
- Production: `.env.production`
- Use Expo's environment variable system

## Performance Considerations

### Optimization Strategies
- Lazy load screens (React.lazy)
- Memoize expensive components
- Optimize image sizes (use Supabase Storage transformations)
- Debounce real-time updates
- Paginate swipe feed (load 10 at a time)

### Caching
- Cache user profile data
- Cache recent matches
- Store chat messages locally (with sync)

## Security Best Practices

### Row Level Security (RLS)
- Enable RLS on all tables
- Policies based on user role and relationships
- Test policies thoroughly

### Data Validation
- Validate on client AND server (Supabase functions)
- Sanitize user inputs
- Rate limit actions (use Supabase Edge Functions)

### Secrets Management
- Never commit API keys
- Use environment variables
- Rotate keys regularly

## Testing Strategy

### Unit Tests
- Jest + React Native Testing Library
- Test utility functions
- Test hooks

### Integration Tests
- Test Supabase queries
- Test real-time subscriptions
- Test navigation flows

### E2E Tests
- Detox or Maestro
- Test critical user flows
- Test on real devices

## Monitoring & Analytics

### Error Tracking
- Sentry (React Native)
- Supabase error logs

### Analytics
- Expo Analytics (basic)
- Custom event tracking for key actions

### Performance Monitoring
- Expo Performance Monitor
- Supabase query performance
