# WingBoard Project Brief

**Version**: 1.0  
**Last Updated**: [Current Date]  
**Status**: Active Development - MVP Phase

## Product Vision

WingBoard is a dating app where women (Queens) outsource their dating life to a 3-person crew of invited friends. The crew handles swiping, bio editing, chat reactions, conversation takeovers, and date proposals. The Queen remains a passive participant who simply approves or lets things happen naturally.

## Core Value Proposition

**Tagline**: "Your friends swipe, roast, and run your love life – zero effort, all dates."

### Problem Solved
- Dating apps are exhausting: endless swiping, bio writing, red flag detection, date scheduling
- Women already screenshot chats to friends for advice – WingBoard makes this live and automated
- Solution: Friends become the app. Queen is just a passenger.

## Key Differentiators

1. **Zero Effort for Queens**: No swiping, typing bios, or scheduling required
2. **Transparent Crew Intervention**: All crew messages signed as "Crew (Name)"
3. **Fun Chaos**: Emoji reacts, funny/serious takeovers, @crew summons
4. **Gender-Specific**: Only women get crews; men swipe solo but can be invited to crews

## Target Audience

- **Primary**: Women 22–35 who share dating screenshots in group chats. Busy, funny, trust friends > algorithms.
- **Secondary**: Men 22–35 who swipe solo; can be invited to a Queen's crew
- **Crew Members**: Friends (any gender) of Queens – motivated by humor and helping

## MVP Scope

### In Scope
- Onboarding & crew formation
- Queen Dashboard (home screen)
- Crew Room (4 tools: Swipe Commander, Bio Lab, Chat Reactor, Date DJ)
- Real-time chat with crew takeover
- Date proposal system
- SMS invite system
- @crew summon feature
- Emoji reaction system

### Out of Scope (for MVP)
- Monetization
- GTM strategy
- Advanced analytics
- AI integrations (except optional)
- Calendar sync (v1.1)
- Web version (mobile-first)

## Success Metrics

- **Acquisition**: 1k Queens in Month 1
- **Engagement**: 80% Queens login daily; 50% crews active >15 min/day
- **Retention**: Day 7: 60%; Day 30: 40%
- **Core KPI**: Dates booked per Queen/week: 2+
- **Viral**: Avg invites sent: 3+ per Queen

## Technology Stack

- **Mobile**: React Native (Expo) - iOS/Android
- **Backend**: Supabase (PostgreSQL, Auth, Real-time, Storage)
- **Notifications**: Supabase Realtime + Push Notifications
- **SMS**: Twilio (for crew invites)
- **State Management**: Redux Toolkit / Zustand
- **Navigation**: React Navigation

## Project Status

Currently in initial setup phase - building foundational architecture and MVP features.
