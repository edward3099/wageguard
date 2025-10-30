export interface BioProposal {
  id: string;
  queen_id: string;
  proposed_by: string;
  proposed_bio: string;
  votes: Record<string, string>; // { user_id: emoji }
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface DateProposal {
  id: string;
  match_id: string;
  proposed_by: string;
  proposed_time: string;
  proposed_location: string;
  votes: Record<string, string>; // { user_id: emoji }
  queen_status: 'pending' | 'accepted' | 'rejected';
  match_status: 'pending' | 'accepted' | 'rejected';
  status: 'pending' | 'locked' | 'rejected';
  created_at: string;
}
