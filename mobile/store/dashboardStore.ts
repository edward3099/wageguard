import { create } from 'zustand';
import { DashboardData, PendingApproval } from '@/types/dashboard';
import { Match, Profile } from '@/types/match';
import { BioProposal, DateProposal } from '@/types/crew';
import { Chat } from '@/types/chat';
import * as dashboardService from '@/services/dashboardService';

interface DashboardState {
  // Data
  dashboardData: DashboardData | null;
  
  // Loading states
  loading: boolean;
  approving: boolean;
  
  // Error state
  error: Error | null;
  
  // Actions
  fetchDashboardData: (queenId: string) => Promise<void>;
  approveAll: (queenId: string) => Promise<void>;
  refresh: (queenId: string) => Promise<void>;
  
  // Selectors
  getPendingApprovals: () => PendingApproval[];
  getPendingMatches: () => Match[];
  getPendingBioProposals: () => BioProposal[];
  getPendingDateProposals: () => DateProposal[];
  hasPendingApprovals: () => boolean;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Initial state
  dashboardData: null,
  loading: false,
  approving: false,
  error: null,

  // Actions
  fetchDashboardData: async (queenId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await dashboardService.getDashboardData(queenId);
      
      if (error) {
        throw error;
      }

      set({ 
        dashboardData: data, 
        loading: false 
      });
    } catch (error) {
      set({ 
        error: error as Error, 
        loading: false 
      });
    }
  },

  approveAll: async (queenId: string) => {
    set({ approving: true, error: null });
    try {
      const state = get();
      const approvals = state.getPendingApprovals();
      
      const matchIds = approvals
        .filter(a => a.type === 'match')
        .map(a => a.id);
      
      const bioProposalIds = approvals
        .filter(a => a.type === 'bio')
        .map(a => a.id);
      
      const dateProposalIds = approvals
        .filter(a => a.type === 'date')
        .map(a => a.id);

      const { error } = await dashboardService.approveAll(
        queenId,
        matchIds,
        bioProposalIds,
        dateProposalIds
      );

      if (error) {
        throw error;
      }

      // Refresh data
      await get().fetchDashboardData(queenId);
      
      set({ approving: false });
    } catch (error) {
      set({ 
        error: error as Error, 
        approving: false 
      });
    }
  },

  refresh: async (queenId: string) => {
    await get().fetchDashboardData(queenId);
  },

  // Selectors
  getPendingApprovals: () => {
    const state = get();
    if (!state.dashboardData) return [];

    const approvals: PendingApproval[] = [];

    // Pending matches
    state.dashboardData.matches
      .filter(m => m.status === 'pending_approval')
      .forEach(match => {
        approvals.push({
          type: 'match',
          id: match.id,
          title: 'New Match',
          description: `Match with ${(match as any).match_user?.name || 'someone'}`,
          data: match,
        });
      });

    // Pending bio proposals
    state.dashboardData.pendingBioProposals.forEach(bio => {
      approvals.push({
        type: 'bio',
        id: bio.id,
        title: 'Bio Update',
        description: bio.proposed_bio.substring(0, 50) + '...',
        data: bio,
      });
    });

    // Pending date proposals
    state.dashboardData.pendingDateProposals.forEach(date => {
      const matchUser = (date as any).match?.match_user;
      approvals.push({
        type: 'date',
        id: date.id,
        title: 'Date Proposal',
        description: `${new Date(date.proposed_time).toLocaleDateString()} - ${date.proposed_location}`,
        data: date,
      });
    });

    return approvals;
  },

  getPendingMatches: () => {
    const state = get();
    return state.dashboardData?.matches.filter(m => m.status === 'pending_approval') || [];
  },

  getPendingBioProposals: () => {
    const state = get();
    return state.dashboardData?.pendingBioProposals || [];
  },

  getPendingDateProposals: () => {
    const state = get();
    return state.dashboardData?.pendingDateProposals || [];
  },

  hasPendingApprovals: () => {
    return get().getPendingApprovals().length > 0;
  },
}));
