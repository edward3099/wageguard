# WingBoard Active Context

## Current Focus

**Phase**: Foundation Complete - Ready for Feature Development  
**Status**: Core infrastructure set up, ready to build MVP features

## Recent Changes

- ✅ Created Memory Bank structure
- ✅ Defined project architecture (Supabase + React Native)
- ✅ Designed complete database schema
- ✅ Created React Native project structure with Expo Router
- ✅ Implemented authentication service and screens
- ✅ Set up Zustand state management
- ✅ Created TypeScript types for all entities
- ✅ Built database migrations with RLS policies
- ✅ Created setup documentation

## Next Steps

1. **Complete Authentication Flow**
   - Test phone auth with Supabase
   - Handle new user onboarding
   - Role detection and routing

2. **Queen Onboarding**
   - Name input screen
   - Crew invite generation
   - SMS sending (Twilio integration)
   - Deep link handling for invites
   - Crew joining flow

3. **Queen Dashboard**
   - Fetch matches from Supabase
   - Display pending approvals
   - Real-time updates
   - "Approve All" functionality

4. **Crew Room Tools**
   - Swipe Commander (profile feed, voting)
   - Bio Lab (proposal creation, voting)
   - Chat Reactor (chat list, reactions, takeover)
   - Date DJ (proposal creation, voting)

5. **Real-time Chat**
   - Message display
   - Crew reactions
   - Crew takeover with signing
   - @crew mention detection

## Active Decisions

### Technology Choices Made
- ✅ **Supabase** over Firebase (user preference)
- ✅ **React Native** over Flutter (aligned with PRD)
- ✅ **Expo** for faster development (recommended)
- ✅ **Phone Auth** only (no email for MVP)

### Pending Decisions
- State management library: Redux Toolkit vs Zustand (leaning Zustand for simplicity)
- UI library: React Native Paper vs NativeBase vs custom (evaluate both)
- Testing framework: Jest setup details
- Deep linking strategy: Expo Linking vs React Navigation linking

## Current Blockers

- None at this time

## Development Priorities

### Week 1 (Current)
1. Project initialization
2. Supabase setup and schema
3. Authentication flow
4. Basic navigation structure

### Week 2
1. Queen onboarding
2. Crew invite system
3. Queen Dashboard (basic UI)

### Week 3
1. Crew Room tools (Swipe Commander, Bio Lab)
2. Chat system foundation
3. Date proposal system

### Week 4
1. Real-time features
2. Crew takeover functionality
3. @crew summon feature
4. Polish and testing

## Notes

- Mobile-first approach: No web version for MVP
- Focus on iOS first, then Android
- Use Expo Go for initial testing
- Keep UI simple and fun (humor > polish)
- Real-time is critical for crew collaboration

## Questions to Resolve

1. Mock data source for profiles (Tinder/Bumble API vs mock data)?
2. Calendar integration priority (v1.1 or MVP)?
3. Push notification strategy (Expo vs Supabase)?
4. Image upload flow (direct to Supabase Storage)?
