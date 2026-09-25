import { create } from 'zustand'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  const saved = localStorage.getItem('smartstay-theme')
  if (saved === 'dark') {
    document.documentElement.classList.add('dark')
    return 'dark'
  }
  document.documentElement.classList.remove('dark')
  return 'light'
}

export const useAppStore = create((set, get) => ({
  // Theme
  theme: getInitialTheme(),
  setTheme: (newTheme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('smartstay-theme', newTheme)
      if (newTheme === 'dark') document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    }
    set({ theme: newTheme })
  },
  toggleTheme: () => {
    const current = get().theme
    const next = current === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },

  // UI
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // Toasts
  toasts: [],
  addToast: (msg, type = 'success') =>
    set((s) => ({ toasts: [...s.toasts, { id: Date.now(), msg, type }] })),
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // Confirm Modal
  confirmState: { isOpen: false, msg: '', resolve: null },
  systemConfirm: (msg) => new Promise((resolve) => {
    set({ confirmState: { isOpen: true, msg, resolve } })
  }),
  resolveConfirm: (val) => {
    const { resolve } = get().confirmState
    if (resolve) resolve(val)
    set({ confirmState: { isOpen: false, msg: '', resolve: null } })
  },

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
