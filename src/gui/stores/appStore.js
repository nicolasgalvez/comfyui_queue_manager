import { create } from 'zustand';

export const useAppStore = create((set) => ({
  filters : null,
  route : "queue",
  mode: 'queue',
  clientId: null,
  shiftDown: false,
  setFilters : (filters) => set((state) => ({...state, filters: filters})),
  setRoute : (route) => set((state) => ({...state, route: route})),
  setMode : (mode) => set((state) => ({...state, mode: mode})),
  setClientId : (clientId) => set((state) => ({...state, clientId: clientId})),
  setShiftDown : (shiftDown) => set((state) => ({...state, shiftDown: shiftDown})),
}));
