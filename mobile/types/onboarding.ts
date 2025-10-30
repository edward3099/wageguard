export interface OnboardingData {
  name: string;
  gender?: 'male' | 'female' | 'other';
}

export interface CrewInviteData {
  invite_token: string;
  phone: string;
  invite_link: string;
  expires_at: string;
}

export interface OnboardingState {
  step: 'name' | 'gender' | 'invite' | 'waiting' | 'complete';
  name: string;
  gender?: 'male' | 'female' | 'other';
  invites: CrewInviteData[];
  crewFormed: boolean;
}
