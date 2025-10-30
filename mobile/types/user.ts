export type UserRole = 'queen' | 'crew' | 'match';

export interface User {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  gender?: 'male' | 'female' | 'other';
  created_at: string;
  updated_at: string;
}

export interface Queen {
  user_id: string;
  bio: string;
  crew_formed: boolean;
  mute_crew: boolean;
  blur_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface Crew {
  id: string;
  queen_id: string;
  crew_member_1_id: string;
  crew_member_2_id: string;
  crew_member_3_id: string;
  status: 'pending' | 'active' | 'inactive';
  created_at: string;
}

export interface CrewMember {
  crew_id: string;
  user_id: string;
  role: 'member_1' | 'member_2' | 'member_3';
  voice_mode: 'funny' | 'serious';
  joined_at: string;
}

export interface CrewInvite {
  id: string;
  queen_id: string;
  invite_token: string;
  phone: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  created_at: string;
}
