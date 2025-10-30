import { Profile, SwipeDecision, SwipeVoteCount } from '@/types/match';

/**
 * Props for SwipeCard component
 */
export interface SwipeCardProps {
  profile: Profile;
  onSwipe: (decision: 'like' | 'pass') => void;
  disabled?: boolean;
  voteCount?: SwipeVoteCount | null;
}

/**
 * Props for SwipeVoteIndicator component
 */
export interface SwipeVoteIndicatorProps {
  votes: SwipeVoteCount | null;
  showMajority?: boolean;
}

/**
 * Props for SwipeScreen component
 */
export interface SwipeScreenProps {
  queenId: string;
}

/**
 * Swipe service response types
 */
export interface SwipeServiceResponse<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Profile fetch options
 */
export interface GetProfilesOptions {
  limit?: number;
  excludeSwiped?: boolean;
}

/**
 * Swipe submission result
 */
export interface SwipeResult {
  decision: SwipeDecision;
  voteCounts: SwipeVoteCount;
  matchCreated?: boolean;
}
