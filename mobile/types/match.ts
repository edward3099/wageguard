export interface Match {
  id: string;
  queen_id: string;
  match_user_id: string;
  status: 'pending_approval' | 'approved' | 'rejected';
  matched_at: string;
  approved_at?: string;
}

export interface Profile {
  user_id: string;
  name?: string; // User's name from users table
  photos: string[];
  age: number;
  location: string;
  bio: string;
  created_at: string;
  updated_at: string;
}

export interface SwipeDecision {
  id: string;
  queen_id: string;
  profile_id: string;
  crew_member_id: string;
  decision: 'like' | 'pass';
  created_at: string;
}

export interface SwipeVoteCount {
  profile_id: string;
  likes: number;
  passes: number;
  total_votes: number;
  needs_majority: boolean;
}
