import { Match, Profile } from './match';
import { BioProposal, DateProposal } from './crew';
import { Chat } from './chat';

export interface DashboardData {
  matches: Match[];
  pendingBioProposals: BioProposal[];
  pendingDateProposals: DateProposal[];
  activeChats: Chat[];
}

export interface PendingApproval {
  type: 'match' | 'bio' | 'date';
  id: string;
  title: string;
  description: string;
  data: Match | BioProposal | DateProposal;
}
