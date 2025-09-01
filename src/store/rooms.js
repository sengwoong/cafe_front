import { create } from 'zustand'

export const useRoomsStore = create((set) => ({
  rooms: [],
  currentRoomId: 1,
  setRooms: (rooms) => set({ rooms }),
  setCurrentRoomId: (id) => set({ currentRoomId: id }),
}))


