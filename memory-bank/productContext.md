# WingBoard Product Context

## Why WingBoard Exists

Dating apps have created a new form of digital labor for women. The constant decision-making, profile curation, and conversation management is exhausting. Yet, women already have an informal system: screenshotting chats to friends, asking "is this weird?", getting feedback on profiles.

WingBoard makes this informal support system the core product experience. Friends aren't helpers on the side – they ARE the app.

## User Experience Philosophy

### For Queens
- **Passive by Design**: Queen opens app → sees results → taps "Approve All" → dates locked
- **Optional Engagement**: Can chat live if desired, but doesn't have to
- **Zero Maintenance**: No profile updates, no bio writing, no swiping fatigue
- **Transparency**: Always knows when crew is acting (signed messages)

### For Crew
- **Group Decision Making**: Majority rules for swipes, bios, dates
- **Playful Tools**: Emoji reactions, funny/serious voice modes
- **Low Commitment**: 10 swipes/day limit prevents burnout
- **Fun Factor**: Humor-driven experience with emoji reactions and roasts

### For Matches
- **Normal Experience**: Standard dating app chat interface
- **Transparency**: See when crew is speaking (but it's normal)
- **Fun Interactions**: Can summon crew with @crew for questions
- **Clear Expectations**: Know this is "WingBoarded" (optional badge)

## Core User Flows

### Queen Onboarding Flow
1. Open app → Enter name → Select "I'm a Queen"
2. Prompt: "Text this link to 3 friends to form your crew"
3. Auto-generate SMS with invite link
4. Friends tap link → join crew (up to 3)
5. Crew formed → app activates → swiping starts immediately

### Crew Daily Flow
1. Open Crew Room → See tabs: Swipe Commander, Bio Lab, Chat Reactor, Date DJ
2. **Swipe Commander**: Group swipe 10 profiles (majority 🔥/🚮 = match)
3. **Bio Lab**: Propose edits → emoji-vote (majority 🔥 = locked)
4. **Chat Reactor**: Watch live chats → emoji-react or takeover
5. **Date DJ**: Propose time/place → emoji-vote (majority 👍 = sent)

### Chat & Date Flow
1. Match made → Chat opens
2. Queen/Match chat normally; crew sees live
3. Crew emoji-reacts (visible to all)
4. Crew can takeover (signed: "👑 [Queen]'s Crew ([Name]): [message]")
5. Match: "@crew What's her favorite drink?" → Crew alert → Answer signed
6. Crew proposes date → Queen/Match accept → Locked

### Approval Flow
1. Queen opens dashboard → Sees pending items (matches, bio changes, dates)
2. Tap "Approve All" → Confetti animation → "3 dates locked while you showered"

## Key Features

### Crew Room Tools

1. **Swipe Commander**
   - Group view of profiles
   - Each crew member swipes
   - Majority vote (🔥 match, 🚮 pass)
   - 10 profiles/day limit

2. **Bio Lab**
   - Current bio displayed
   - Crew proposes edits
   - Emoji-vote system (🔥 = approve, 🚮 = reject)
   - Majority wins → sent to Queen for approval

3. **Chat Reactor**
   - Live view of all Queen's chats
   - Emoji reaction set: 🔥, 😏, 🤔, 😭, 🚮, 🥵
   - Reactions visible to Queen + Match
   - Takeover mode: Tap to type (signed automatically)

4. **Date DJ**
   - Propose time/place for matches
   - Emoji-vote (👍 = approve, 👎 = reject)
   - Majority wins → sent to both Queen and Match
   - Both accept → auto-locked

### Voice Toggle
- **Funny Mode** (🤡): Playful, humorous takeovers
- **Serious Mode** (💼): Professional, helpful takeovers
- Applies prefix to all crew messages

### Privacy Features
- **Blur Mode**: Default redacted chat view for crew (Queen can toggle)
- **Mute Crew**: Disable takeover (crew still swipes/reacts)
- **Signed Messages**: Always transparent who's speaking
- **Ephemeral Data**: No long-term chat storage, no stats tracking

## Design Principles

1. **Humor > Polish**: Funny animations, emoji-driven, playful
2. **Zero Effort**: 1-tap everything for Queen
3. **Mobile-First**: Vertical flows, big buttons, thumb-friendly
4. **Transparency**: Never impersonate, always signed
5. **Group Fun**: Crew experience is collaborative and social
