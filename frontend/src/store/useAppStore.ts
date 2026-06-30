import { create } from "zustand";

interface AppState {
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;

  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;

  /** Document IDs the next message should be scoped to. Empty = all docs. */
  selectedDocumentIds: string[];
  toggleSelectedDocument: (id: string) => void;
  clearSelectedDocuments: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeChatId: null,
  setActiveChatId: (id) => set({ activeChatId: id }),

  isMobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),

  selectedDocumentIds: [],
  toggleSelectedDocument: (id) =>
    set((state) => ({
      selectedDocumentIds: state.selectedDocumentIds.includes(id)
        ? state.selectedDocumentIds.filter((d) => d !== id)
        : [...state.selectedDocumentIds, id],
    })),
  clearSelectedDocuments: () => set({ selectedDocumentIds: [] }),
}));
