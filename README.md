# WingBoard

**Tagline**: "Your friends swipe, roast, and run your love life – zero effort, all dates."

WingBoard is a dating app where women (Queens) outsource their dating life to a 3-person crew of invited friends. The crew handles swiping, bio editing, chat reactions, conversation takeovers, and date proposals. The Queen remains a passive participant who simply approves or lets things happen naturally.

## 🎯 Key Features

- **Zero Effort for Queens**: No swiping, typing bios, or scheduling required
- **Transparent Crew Intervention**: All crew messages signed as "Crew (Name)"
- **Fun Chaos**: Emoji reacts, funny/serious takeovers, @crew summons
- **Real-time Collaboration**: Live updates for swipes, chats, and votes
- **Group Decision Making**: Majority rules for swipes, bios, and dates

## 🏗️ Architecture

- **Frontend**: React Native (Expo) - iOS/Android
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **SMS**: Twilio (for crew invites)
- **State Management**: Zustand
- **Navigation**: Expo Router

## 📁 Project Structure

```
wingboard/
├── mobile/              # React Native app (Expo)
│   ├── app/            # Expo Router screens
│   ├── components/     # React components
│   ├── services/       # API clients (Supabase, Auth)
│   ├── store/          # Zustand state management
│   └── types/          # TypeScript types
├── supabase/           # Database migrations
│   └── migrations/     # SQL migration files
├── docs/               # Documentation
└── memory-bank/        # Project context and planning
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Supabase account
- Twilio account (for SMS)

### Setup

1. **Clone and Install**
```bash
git clone <repo-url>
cd wingboard
cd mobile && npm install
```

2. **Configure Environment**
```bash
cd mobile
cp .env.example .env
# Fill in your Supabase credentials
```

3. **Set Up Supabase**
- Create Supabase project at [supabase.com](https://supabase.com)
- Run migrations from `supabase/migrations/001_initial_schema.sql`
- Enable Phone Auth and Realtime
- See `supabase/README.md` for detailed setup

4. **Start Development**
```bash
cd mobile
npm start
# Scan QR code with Expo Go app or
npm run ios  # iOS Simulator
npm run android  # Android Emulator
```

## 📱 User Roles

### Queen (Female User)
- Signs up and invites 3 friends to crew
- Views dashboard with results
- Chats live if desired
- Taps "Approve All" to lock in matches/dates
- Zero effort required

### Crew Member (Invited Friend)
- Joins via invite link
- Accesses Crew Room: Swipe Commander, Bio Lab, Chat Reactor, Date DJ
- Emoji-reacts to chats
- Takes over chats (signed)
- Answers @crew summons
- Votes on bios/dates

### Match (User)
- Interacts via standard chat
- Sees crew takeovers (signed)
- Can emoji-react to crew messages
- Can summon "@crew [question]"
- Accepts/rejects date proposals

## 🔧 Development

### Adding a New Screen

1. Create file in `mobile/app/(role)/screen-name.tsx`
2. Expo Router automatically creates the route
3. Update navigation as needed

### State Management

Create Zustand stores in `mobile/store/`:

```typescript
import { create } from 'zustand';

export const useMyStore = create((set) => ({
  data: [],
  fetchData: async () => {
    // Fetch logic
  },
}));
```

### Supabase Queries

```typescript
import { supabase } from '@/services/supabase';

const { data, error } = await supabase
  .from('table_name')
  .select('*');
```

## 📊 Database Schema

See `supabase/migrations/001_initial_schema.sql` for complete schema.

### Key Tables
- `users` - All app users
- `queens` - Queen-specific data
- `crews` - Crew groups (max 3 members)
- `matches` - Matches between Queens and users
- `chats` - Chat conversations
- `messages` - Individual messages with crew takeovers
- `swipe_decisions` - Crew swipe votes
- `bio_proposals` - Bio edit proposals
- `date_proposals` - Date proposals
- `crew_invites` - Invite tokens

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run on device
npm run ios
npm run android
```

## 📚 Documentation

- **[WINGBOARD Frontend Framework](docs/WINGBOARD-FRONTEND-FRAMEWORK.md)** - Systematic framework for building features (W-I-N-G-B-O-A-R-D)
- [Implementation Plan](docs/wingboard-implementation-plan.md)
- [Memory Bank](memory-bank/) - Project context and planning
- [Supabase Setup](supabase/README.md)
- [Current Status](docs/CURRENT-STATUS.md)

## 🎯 MVP Roadmap

- [x] Project setup and architecture
- [x] Database schema design
- [ ] Phone authentication
- [ ] Queen onboarding flow
- [ ] Crew invite system
- [ ] Queen Dashboard
- [ ] Crew Room tools
- [ ] Real-time chat
- [ ] Date proposal system
- [ ] @crew summon feature

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

---

**Built with ❤️ for effortless dating through friend-powered chaos.**
