import { create } from 'zustand';

interface CompanySelectionState {
  selectedCompanyId: string | null;
  setSelectedCompanyId: (companyId: string) => void;
}

export const useCompanySelection = create<CompanySelectionState>((set) => ({
  selectedCompanyId: null,
  setSelectedCompanyId: (companyId) => set({ selectedCompanyId: companyId }),
}));
