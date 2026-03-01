import { create } from 'zustand'

export const useNotifStore = create((set, get) => ({
  notifications: [],
  unread: 0,
  add: (notif) =>
    set((s) => ({
      notifications: [{ id: Date.now(), ...notif }, ...s.notifications].slice(0, 50),
      unread: s.unread + 1,
    })),
  markRead: () => set({ unread: 0 }),
  clear:    () => set({ notifications: [], unread: 0 }),
}))
