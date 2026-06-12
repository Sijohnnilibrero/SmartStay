import { create } from 'zustand'

export const useAppStore = create((set) => ({
  // UI
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // Toasts
  toasts: [],
  addToast: (msg, type = 'success') =>
    set((s) => ({ toasts: [...s.toasts, { id: Date.now(), msg, type }] })),
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // Search filters
  searchQuery:       '',
  selectedIsland:    'All',
  selectedBudget:    'All',
  selectedAmenities: [],
  setSearchQuery:    (q) => set({ searchQuery: q }),
  setSelectedIsland: (island) => set({ selectedIsland: island }),
  setSelectedBudget: (b) => set({ selectedBudget: b }),
  toggleAmenity: (a) =>
    set((s) => ({
      selectedAmenities: s.selectedAmenities.includes(a)
        ? s.selectedAmenities.filter((x) => x !== a)
        : [...s.selectedAmenities, a],
    })),
  clearFilters: () =>
    set({ searchQuery: '', selectedIsland: 'All', selectedBudget: 'All', selectedAmenities: [] }),
}))
