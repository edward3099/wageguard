// Supabase Configuration
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// App Configuration
export const APP_SCHEME = 'wingboard';
export const INVITE_LINK_BASE = `${APP_SCHEME}://invite`;

// Limits
export const CREW_SIZE_LIMIT = 3;
export const DAILY_SWIPE_LIMIT = 10;

// Emoji Reactions
export const EMOJI_REACTIONS = ['🔥', '😏', '🤔', '😭', '🚮', '🥵'] as const;
export const VOTE_EMOJIS = {
  APPROVE: '🔥',
  REJECT: '🚮',
  LIKE: '🔥',
  PASS: '🚮',
  DATE_APPROVE: '👍',
  DATE_REJECT: '👎',
} as const;

// Voice Modes
export const VOICE_MODES = {
  FUNNY: '🤡',
  SERIOUS: '💼',
} as const;
