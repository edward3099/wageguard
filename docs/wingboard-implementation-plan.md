# WingBoard Implementation Plan

## Overview

This document outlines the complete implementation plan for WingBoard MVP, built with React Native (Expo) and Supabase.

## Architecture Summary

- **Frontend**: React Native (Expo) - TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **SMS**: Twilio for crew invites
- **State**: Zustand (simpler than Redux for MVP)
- **Navigation**: React Navigation

## Phase 1: Project Setup (Day 1-2)

### 1.1 Initialize React Native Project
```bash
npx create-expo-app@latest wingboard-mobile --template
cd wingboard-mobile
npm install
```

### 1.2 Install Core Dependencies
```bash
# Supabase
npm install @supabase/supabase-js

# Navigation
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context

# State Management
npm install zustand

# Forms & Validation
npm install react-hook-form zod @hookform/resolvers

# UI Components
npm install react-native-paper react-native-vector-icons

# Utils
npm install expo-linking expo-notifications
npm install date-fns
```

### 1.3 Project Structure
```
wingboard-mobile/
├── app/                    # Expo Router screens (or screens/)
├── components/
│   ├── common/            # Shared components
│   ├── crew/              # Crew-specific components
│   └── queen/             # Queen-specific components
├── services/
│   ├── supabase.ts        # Supabase client
│   ├── auth.ts            # Auth service
│   ├── twilio.ts          # SMS service (backend)
│   └── storage.ts          # Image upload
├── store/
│   ├── authStore.ts       # Auth state
│   ├── matchStore.ts      # Matches state
│   └── crewStore.ts       # Crew state
├── hooks/
│   ├── useAuth.ts
│   ├── useRealtime.ts
│   └── useCrew.ts
├── types/
│   ├── user.ts
│   ├── match.ts
│   └── crew.ts
├── utils/
│   ├── validation.ts
│   └── helpers.ts
└── constants/
    └── config.ts
```

## Phase 2: Supabase Setup (Day 2-3)

### 2.1 Create Supabase Project
1. Sign up at supabase.com
2. Create new project: "wingboard"
3. Note: URL and anon key

### 2.2 Database Schema Migration
Create `supabase/migrations/001_initial_schema.sql` with:
- Users table
- Queens table
- Crews table
- Crew members table
- Matches table
- Profiles table
- Chats table
- Messages table
- Swipe decisions table
- Bio proposals table
- Date proposals table
- Crew invites table

### 2.3 RLS Policies
- Queens can only see their own data
- Crew members can see their crew's data
- Matches can see their match chats
- Enforce no overlap (crew can't be matches)

### 2.4 Storage Buckets
- `profile-photos` - Public read, authenticated write
- RLS policies for photo access

### 2.5 Enable Realtime
- Enable for: messages, swipe_decisions, bio_proposals, date_proposals
- Configure publications

## Phase 3: Authentication (Day 3-4)

### 3.1 Phone Auth Setup
- Configure Supabase Phone Auth
- Set up SMS provider (Twilio integration in Supabase)

### 3.2 Auth Screens
- `PhoneInputScreen` - Enter phone number
- `OTPVerifyScreen` - Enter OTP code
- `RoleSelectionScreen` - Queen vs Crew vs Match (if needed)

### 3.3 Auth Service
```typescript
// services/auth.ts
- signInWithPhone(phone: string)
- verifyOTP(phone: string, token: string)
- signOut()
- getCurrentUser()
- checkUserRole()
```

### 3.4 Auth Store (Zustand)
```typescript
// store/authStore.ts
- user state
- session state
- role state
- auth actions
```

## Phase 4: Onboarding Flow (Day 4-6)

### 4.1 Queen Onboarding
**Screenflow**:
1. `OnboardingScreen` - Welcome, enter name
2. `CrewInviteScreen` - Generate invite links
3. `WaitingForCrewScreen` - Show pending invites
4. `DashboardScreen` - Active when crew ready

**Features**:
- Generate unique invite tokens
- Create `crew_invites` records
- Generate SMS message with deep link
- Handle deep link to join crew

### 4.2 Crew Invite System
**Backend Service** (Supabase Edge Function or API route):
- Generate invite token
- Store in `crew_invites` table
- Send SMS via Twilio
- Return invite link

**Deep Link Handling**:
- `wingboard://invite/{token}`
- Verify token
- Join crew flow
- Update `crew_members` table

### 4.3 Profile Creation
- Basic profile form (photos, age, location, bio)
- Upload photos to Supabase Storage
- Create profile record

## Phase 5: Queen Dashboard (Day 6-7)

### 5.1 Dashboard Screen
**Components**:
- `MatchCard` - New matches display
- `PendingApprovalsCard` - Bio changes, dates pending
- `ActiveChatsCard` - Recent chats with emoji reactions
- `ApproveAllButton` - One-tap approval

**Features**:
- Real-time updates via Supabase Realtime
- Pull to refresh
- Navigation to chat/details

### 5.2 Approve All Flow
- Fetch all pending items
- Batch update status to "approved"
- Show confetti animation
- Update dashboard

## Phase 6: Crew Room (Day 7-10)

### 6.1 Crew Room Navigation
- Tab navigation with 4 tabs:
  1. Swipe Commander
  2. Bio Lab
  3. Chat Reactor
  4. Date DJ

### 6.2 Swipe Commander
**Features**:
- Fetch profiles (10/day limit)
- Display profile card (swipeable)
- Crew members swipe individually
- Show live vote counts
- Majority wins → create match
- Real-time vote updates

**Components**:
- `SwipeCard` - Profile display
- `VoteIndicator` - Live vote counts
- `SwipeButtons` - 🔥 Like / 🚮 Pass

### 6.3 Bio Lab
**Features**:
- Display current bio
- Propose bio edit (text input)
- Show pending proposals
- Emoji vote (🔥 approve, 🚮 reject)
- Majority wins → send to Queen
- Real-time vote updates

**Components**:
- `BioDisplay` - Current bio
- `BioProposalForm` - Create proposal
- `BioProposalCard` - Display proposal with votes

### 6.4 Chat Reactor
**Features**:
- List all Queen's active chats
- Tap chat → view messages
- Emoji reaction picker (🔥, 😏, 🤔, 😭, 🚮, 🥵)
- Crew takeover button
- Voice toggle (funny 🤡 / serious 💼)
- Signed messages display
- Real-time message updates

**Components**:
- `ChatList` - All active chats
- `ChatView` - Message thread
- `EmojiReactionPicker` - Reaction selector
- `CrewTakeoverInput` - Message input with signing
- `CrewMessage` - Signed crew message display

### 6.5 Date DJ
**Features**:
- Select match
- Propose time/place
- Crew emoji vote (👍 approve, 👎 reject)
- Majority wins → send to Queen + Match
- Show proposal status
- Real-time vote updates

**Components**:
- `MatchSelector` - Choose match
- `DateProposalForm` - Time/place input
- `DateProposalCard` - Display with votes

## Phase 7: Chat System (Day 10-12)

### 7.1 Chat Screen
**Features**:
- Message list (queen + match + crew)
- Real-time message updates
- Emoji reactions display
- Crew takeover indicator
- @crew mention detection
- Message input (queen + crew)

**Components**:
- `MessageList` - Scrollable message list
- `MessageBubble` - Individual message
- `CrewMessageBubble` - Signed crew message
- `EmojiReaction` - Reaction display
- `MessageInput` - Text input

### 7.2 Crew Takeover
**Flow**:
1. Crew member taps "Takeover" button
2. Select voice mode (funny/serious)
3. Type message
4. Send → Auto-sign as "👑 [Queen]'s Crew ([Name]): [message]"
5. Save to `messages` with `is_crew_takeover=true`

### 7.3 @crew Mentions
**Detection**:
- Parse message for "@crew [question]"
- Create notification/alert for crew
- Crew can respond (signed)
- Show in chat thread

## Phase 8: Date Proposal System (Day 12-13)

### 8.1 Proposal Flow
1. Crew proposes in Date DJ
2. Crew votes → Majority wins
3. Send to Queen + Match
4. Both see proposal card
5. Accept/Reject buttons
6. Both accept → Locked status
7. Notification to crew

### 8.2 Date Display
- Show in Queen Dashboard
- Show in Match's chat
- Status indicators (pending, accepted, rejected, locked)

## Phase 9: Real-time Features (Day 13-14)

### 9.1 Real-time Subscriptions
- Chat messages
- Swipe votes
- Bio proposal votes
- Date proposal votes
- Date proposal status
- Match notifications

### 9.2 Optimization
- Subscribe only when screen active
- Unsubscribe on unmount
- Debounce rapid updates
- Handle reconnection

## Phase 10: Polish & Testing (Day 14-16)

### 10.1 Animations
- Confetti on "Approve All"
- Swipe animations
- Loading states
- Transitions

### 10.2 Error Handling
- Network errors
- Auth errors
- Validation errors
- User-friendly messages

### 10.3 Testing
- Test critical flows
- Test real-time updates
- Test crew collaboration
- Test edge cases

### 10.4 App Store Prep
- App icons
- Splash screens
- Privacy policy
- App Store listing

## Technical Implementation Details

### Supabase Queries

**Get Queen's Pending Approvals**:
```sql
SELECT 
  matches.*,
  bio_proposals.*,
  date_proposals.*
FROM matches
LEFT JOIN bio_proposals ON bio_proposals.queen_id = matches.queen_id
LEFT JOIN date_proposals ON date_proposals.match_id = matches.id
WHERE matches.queen_id = $1 
  AND matches.status = 'pending_approval'
  OR bio_proposals.status = 'pending'
  OR date_proposals.status = 'pending'
```

**Check Swipe Majority**:
```sql
SELECT 
  profile_id,
  COUNT(*) FILTER (WHERE decision = 'like') as likes,
  COUNT(*) FILTER (WHERE decision = 'pass') as passes,
  COUNT(*) as total_votes
FROM swipe_decisions
WHERE queen_id = $1 AND profile_id = $2
GROUP BY profile_id
HAVING COUNT(*) FILTER (WHERE decision = 'like') > COUNT(*) FILTER (WHERE decision = 'pass')
```

### State Management Pattern

```typescript
// store/matchStore.ts
import create from 'zustand'

interface MatchStore {
  matches: Match[]
  loading: boolean
  fetchMatches: (queenId: string) => Promise<void>
  approveMatch: (matchId: string) => Promise<void>
}

export const useMatchStore = create<MatchStore>((set) => ({
  matches: [],
  loading: false,
  fetchMatches: async (queenId) => {
    // Fetch from Supabase
  },
  approveMatch: async (matchId) => {
    // Update in Supabase
  }
}))
```

### Real-time Subscription Pattern

```typescript
// hooks/useRealtimeChat.ts
import { useEffect } from 'react'
import { supabase } from '../services/supabase'

export function useRealtimeChat(chatId: string) {
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${chatId}`)
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

    return () => {
      channel.unsubscribe()
    }
  }, [chatId])
}
```

## Success Criteria

### MVP Complete When:
- ✅ Queens can sign up and invite crew
- ✅ Crew can join and access Crew Room
- ✅ Crew can swipe and create matches
- ✅ Crew can edit bio (with voting)
- ✅ Crew can react to chats and takeover
- ✅ Crew can propose dates
- ✅ Queens can approve all with one tap
- ✅ Real-time updates work
- ✅ @crew mentions work
- ✅ Date proposals work end-to-end

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Supabase Realtime limits | Optimize subscriptions, use polling fallback |
| Twilio SMS costs | Rate limit invites, use deep links primarily |
| Real-time complexity | Start simple, add complexity incrementally |
| Crew coordination issues | Clear UI, live vote counts, majority rules |
| Performance with many chats | Pagination, lazy loading, optimize queries |

## Next Steps After MVP

1. Calendar sync (Google/Apple)
2. Push notifications (@crew alerts)
3. More emoji reactions
4. Crew rotation feature
5. Analytics dashboard
6. Monetization features
