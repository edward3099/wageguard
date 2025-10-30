/**
 * Mock Data Generator for Testing Without Supabase
 * Provides realistic mock data for all app features
 */

import { Profile, Match, SwipeVoteCount } from '@/types/match';
import { Chat, Message } from '@/types/chat';
import { BioProposal, DateProposal } from '@/types/crew';
import { User, Queen, Crew } from '@/types/user';

// Mock user data
export const MOCK_USER: User = {
  id: 'mock-user-1',
  phone: '+1234567890',
  name: 'Test User',
  role: 'queen',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const MOCK_CREW_USER: User = {
  id: 'mock-crew-1',
  phone: '+1234567891',
  name: 'Crew Member',
  role: 'crew',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Mock Queen
export const MOCK_QUEEN: Queen = {
  user_id: MOCK_USER.id,
  bio: 'Just living my best life 🌟',
  crew_formed: true,
  mute_crew: false,
  blur_mode: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Mock Crew
export const MOCK_CREW: Crew = {
  id: 'mock-crew-1',
  queen_id: MOCK_USER.id,
  crew_member_1_id: 'mock-crew-member-1',
  crew_member_2_id: 'mock-crew-member-2',
  crew_member_3_id: 'mock-crew-member-3',
  status: 'active',
  created_at: new Date().toISOString(),
};

// Mock profiles for swiping
const mockProfileNames = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Sage',
  'Blake', 'Cameron', 'Dakota', 'Reese', 'Skylar', 'Avery', 'Hayden', 'Parker'
];

const mockBios = [
  'Love hiking and good coffee ☕',
  'Adventure seeker 🌍',
  'Foodie at heart 🍕',
  'Artist and dreamer 🎨',
  'Fitness enthusiast 💪',
  'Bookworm 📚',
  'Tech geek 💻',
  'Musician 🎸',
  'Dog lover 🐕',
  'Travel photographer 📸',
];

export function generateMockProfiles(count: number = 10): Profile[] {
  return Array.from({ length: count }, (_, i) => ({
    user_id: `mock-user-${i + 100}`,
    name: mockProfileNames[i % mockProfileNames.length],
    bio: mockBios[i % mockBios.length],
    age: 25 + (i % 15),
    location: ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Austin'][i % 5],
    photos: [
      `https://picsum.photos/400/600?random=${i + 1}`,
      `https://picsum.photos/400/600?random=${i + 100}`,
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

// Mock matches
export function generateMockMatches(count: number = 5): Match[] {
  const profiles = generateMockProfiles(count);
  return profiles.map((profile, i) => ({
    id: `mock-match-${i + 1}`,
    queen_id: MOCK_QUEEN.user_id,
    match_user_id: profile.user_id,
    status: i === 0 ? 'pending_approval' : i === 1 ? 'approved' : 'approved',
    matched_at: i > 0 ? new Date(Date.now() - i * 86400000).toISOString() : new Date().toISOString(),
    approved_at: i === 1 ? new Date(Date.now() - i * 86400000).toISOString() : undefined,
  }));
}

// Mock swipe vote counts
export function generateMockVoteCount(profileId: string): SwipeVoteCount {
  const likes = Math.floor(Math.random() * 3) + 1; // 1-3 likes
  const passes = Math.floor(Math.random() * 2); // 0-1 passes
  const totalVotes = likes + passes;
  
  return {
    profile_id: profileId,
    likes,
    passes,
    total_votes: totalVotes,
    needs_majority: totalVotes < 3,
  };
}

// Mock chats
export function generateMockChats(count: number = 3): Chat[] {
  const matches = generateMockMatches(count);
  return matches.map((match, i) => ({
    id: `mock-chat-${i + 1}`,
    match_id: match.id,
    queen_id: MOCK_QUEEN.user_id,
    match_user_id: match.match_user_id,
    created_at: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

// Mock messages
export function generateMockMessages(chatId: string, count: number = 10): Message[] {
  const messages: Message[] = [];
  const sampleMessages = [
    'Hey! How are you?',
    'Nice to match with you!',
    'What are you up to this weekend?',
    'Want to grab coffee sometime?',
    'Haha that\'s funny 😂',
    'Sounds good to me!',
    'Let me check my schedule',
    'How about next week?',
    'Perfect! Looking forward to it',
    'See you then! 👋',
  ];

  for (let i = 0; i < count; i++) {
    const isFromMatch = i % 2 === 0;
    messages.push({
      id: `mock-msg-${chatId}-${i}`,
      chat_id: chatId,
      sender_id: isFromMatch ? `mock-user-${i + 100}` : MOCK_USER.id,
      sender_type: isFromMatch ? 'match' : 'queen',
      content: sampleMessages[i % sampleMessages.length],
      emoji_reactions: {},
      is_crew_takeover: i % 5 === 0 && !isFromMatch,
      crew_member_name: i % 5 === 0 ? 'Crew Member' : undefined,
      voice_mode: i % 5 === 0 ? 'funny' : undefined,
      created_at: new Date(Date.now() - (count - i) * 3600000).toISOString(),
    });
  }

  return messages;
}

// Mock bio proposals
export function generateMockBioProposals(count: number = 3): BioProposal[] {
  const proposals = [
    'Coffee enthusiast, bookworm, and sunset chaser 🌅',
    'Adventure seeker who loves trying new restaurants 🍽️',
    'Dog mom, yoga enthusiast, and weekend explorer 🐕',
  ];

  return proposals.slice(0, count).map((bio, i) => ({
    id: `mock-bio-proposal-${i + 1}`,
    queen_id: MOCK_QUEEN.user_id,
    proposed_by: MOCK_CREW_USER.id,
    proposed_bio: bio,
    status: i === 0 ? 'pending' : 'approved',
    votes: {
      'crew-member-1': i === 0 ? '🔥' : '🔥',
      'crew-member-2': i === 0 ? '🔥' : '🔥',
      'crew-member-3': i === 0 ? '' : '🔥',
    },
    created_at: new Date(Date.now() - i * 86400000).toISOString(),
  }));
}

// Mock date proposals
export function generateMockDateProposals(matchId: string, count: number = 2): DateProposal[] {
  const dates = [
    {
      time: new Date(Date.now() + 3 * 86400000).toISOString(),
      location: 'Blue Bottle Coffee, Brooklyn',
    },
    {
      time: new Date(Date.now() + 7 * 86400000).toISOString(),
      location: 'MoMA, Manhattan',
    },
  ];

  return dates.slice(0, count).map((date, i) => ({
    id: `mock-date-proposal-${matchId}-${i + 1}`,
    match_id: matchId,
    proposed_by: MOCK_CREW_USER.id,
    proposed_time: date.time,
    proposed_location: date.location,
    votes: {
      'crew-member-1': i === 0 ? '👍' : '👍',
      'crew-member-2': i === 0 ? '👍' : '👍',
      'crew-member-3': i === 0 ? '' : '👍',
    },
    queen_status: i === 0 ? 'pending' : 'accepted',
    match_status: i === 0 ? 'pending' : 'pending',
    status: i === 0 ? 'pending' : 'locked',
    created_at: new Date(Date.now() - i * 86400000).toISOString(),
  }));
}

// Storage for mock data (simulates database)
class MockStorage {
  private profiles: Profile[] = [];
  private matches: Match[] = [];
  private chats: Chat[] = [];
  private messages: Map<string, Message[]> = new Map();
  private bioProposals: BioProposal[] = [];
  private dateProposals: DateProposal[] = [];
  private swipeDecisions: Map<string, any[]> = new Map();

  constructor() {
    this.initialize();
  }

  initialize() {
    this.profiles = generateMockProfiles(20);
    this.matches = generateMockMatches(5);
    this.chats = generateMockChats(3);
    this.bioProposals = generateMockBioProposals(3);
    
    // Initialize messages for each chat
    this.chats.forEach(chat => {
      this.messages.set(chat.id, generateMockMessages(chat.id, 10));
    });

    // Initialize date proposals for matches
    this.matches.forEach(match => {
      this.dateProposals.push(...generateMockDateProposals(match.id, 2));
    });
  }

  getProfiles() { return [...this.profiles]; }
  getMatches() { return [...this.matches]; }
  getChats() { return [...this.chats]; }
  getMessages(chatId: string) { return [...(this.messages.get(chatId) || [])]; }
  getBioProposals() { return [...this.bioProposals]; }
  getDateProposals(matchId?: string) {
    if (matchId) {
      return this.dateProposals.filter(p => p.match_id === matchId);
    }
    return [...this.dateProposals];
  }

  addMessage(chatId: string, message: Message) {
    const messages = this.messages.get(chatId) || [];
    messages.push(message);
    this.messages.set(chatId, messages);
  }

  addSwipeDecision(profileId: string, decision: any) {
    const decisions = this.swipeDecisions.get(profileId) || [];
    decisions.push(decision);
    this.swipeDecisions.set(profileId, decisions);
  }

  updateBioProposal(id: string, updates: Partial<BioProposal>) {
    const index = this.bioProposals.findIndex(p => p.id === id);
    if (index >= 0) {
      this.bioProposals[index] = { ...this.bioProposals[index], ...updates };
    }
  }

  updateDateProposal(id: string, updates: Partial<DateProposal>) {
    const index = this.dateProposals.findIndex(p => p.id === id);
    if (index >= 0) {
      this.dateProposals[index] = { ...this.dateProposals[index], ...updates };
    }
  }
}

export const mockStorage = new MockStorage();
