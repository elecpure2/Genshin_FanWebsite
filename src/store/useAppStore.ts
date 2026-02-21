import { create } from 'zustand'

interface AppState {
  currentScene: 'gate' | 'lobby' | 'character'
  activeCharacterId: string | null
  isTransitioning: boolean
  introState: 'pending' | 'playing' | 'done'
  scrollOffset: number
  globalVolume: number
  isMuted: boolean
  setCurrentScene: (scene: 'gate' | 'lobby' | 'character') => void
  setActiveCharacterId: (id: string | null) => void
  setIsTransitioning: (val: boolean) => void
  setIntroState: (state: 'pending' | 'playing' | 'done') => void
  setScrollOffset: (val: number) => void
  setGlobalVolume: (val: number) => void
  setIsMuted: (val: boolean) => void
  transitionType: 'water' | 'leaf' | 'none'
  transitionState: 'idle' | 'in' | 'out'
  setTransitionType: (type: 'water' | 'leaf' | 'none') => void
  setTransitionState: (state: 'idle' | 'in' | 'out') => void
}

export const useAppStore = create<AppState>((set) => ({
  currentScene: 'gate',
  activeCharacterId: null,
  isTransitioning: false,
  introState: 'pending',
  scrollOffset: 0,
  globalVolume: 0.5, // Default BGM volume
  isMuted: false,
  setCurrentScene: (scene) => set({ currentScene: scene }),
  setActiveCharacterId: (id) => set({ activeCharacterId: id }),
  setIsTransitioning: (val) => set({ isTransitioning: val }),
  setIntroState: (state) => set({ introState: state }),
  setScrollOffset: (val) => set({ scrollOffset: val }),
  setGlobalVolume: (val) => set({ globalVolume: val }),
  setIsMuted: (val) => set({ isMuted: val }),
  transitionType: 'none',
  transitionState: 'idle',
  setTransitionType: (type) => set({ transitionType: type }),
  setTransitionState: (state) => set({ transitionState: state }),
}))
