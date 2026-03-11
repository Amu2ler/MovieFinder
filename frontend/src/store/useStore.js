import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set, get) => ({
      // ── User ────────────────────────────────────────────────────────────
      userId: null,
      sessionToken: null,
      onboardingComplete: false,

      setUser: (user) =>
        set({
          userId: user.id,
          sessionToken: user.session_token,
        }),

      setOnboardingComplete: () => set({ onboardingComplete: true }),

      // ── Feed queue ──────────────────────────────────────────────────────
      queue: [],        // array of {movie, score, is_exploration}
      currentIndex: 0,
      isLoadingRecs: false,

      setQueue: (items) => set({ queue: items, currentIndex: 0 }),
      appendQueue: (items) =>
        set((s) => ({ queue: [...s.queue, ...items] })),
      advanceQueue: () =>
        set((s) => ({ currentIndex: s.currentIndex + 1 })),

      setLoadingRecs: (val) => set({ isLoadingRecs: val }),

      // ── Filters ─────────────────────────────────────────────────────────
      platformFilter: [],
      setPlatformFilter: (platforms) => set({ platformFilter: platforms }),

      // ── Hate mode ───────────────────────────────────────────────────────
      bannedDirectors: [],
      bannedActors: [],

      addBannedDirector: (name) =>
        set((s) => ({
          bannedDirectors: s.bannedDirectors.includes(name)
            ? s.bannedDirectors
            : [...s.bannedDirectors, name],
        })),

      addBannedActor: (name) =>
        set((s) => ({
          bannedActors: s.bannedActors.includes(name)
            ? s.bannedActors
            : [...s.bannedActors, name],
        })),

      // ── Tour ────────────────────────────────────────────────────────────
      tourCompleted: false,
      setTourCompleted: () => set({ tourCompleted: true }),
      resetTour: () => set({ tourCompleted: false }),

      // ── Reset (logout) ──────────────────────────────────────────────────
      reset: () =>
        set({
          userId: null,
          sessionToken: null,
          onboardingComplete: false,
          queue: [],
          currentIndex: 0,
          platformFilter: [],
          bannedDirectors: [],
          bannedActors: [],
          tourCompleted: false,
        }),
    }),
    {
      name: 'moviefinder-store',
      partialize: (s) => ({
        userId: s.userId,
        sessionToken: s.sessionToken,
        onboardingComplete: s.onboardingComplete,
        platformFilter: s.platformFilter,
        bannedDirectors: s.bannedDirectors,
        bannedActors: s.bannedActors,
        tourCompleted: s.tourCompleted,
      }),
    }
  )
)

export default useStore
