import { create } from 'zustand'

export const useGameStore = create((set, get) => ({
  inventory: [],
  objects: [],
  users: [],
  selectedInventoryItemId: null,

  setInventory: (items) => set({ inventory: items }),
  setRoomState: ({ users, objects }) => set({ users, objects }),
  addObject: (obj) => set({ objects: [...get().objects, obj] }),
  selectInventoryItem: (id) => set({ selectedInventoryItemId: id }),
  clearSelection: () => set({ selectedInventoryItemId: null }),
}))


