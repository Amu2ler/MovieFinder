import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RecommendationItem, UserCreateResponse } from "../api/types";

interface StoreState {
  // ── User ──────────────────────────────────────────────────────────────
  userId: number | null;
  sessionToken: string | null;
  onboardingComplete: boolean;
  setUser: (user: UserCreateResponse) => void;
  setOnboardingComplete: () => void;

  // ── Feed queue ────────────────────────────────────────────────────────
  queue: RecommendationItem[];
  currentIndex: number;
  isLoadingRecs: boolean;
  setQueue: (items: RecommendationItem[]) => void;
  appendQueue: (items: RecommendationItem[]) => void;
  advanceQueue: () => void;
  setLoadingRecs: (val: boolean) => void;

  // ── Filters ───────────────────────────────────────────────────────────
  platformFilter: string[];
  setPlatformFilter: (platforms: string[]) => void;

  // ── Hate mode ─────────────────────────────────────────────────────────
  bannedDirectors: string[];
  bannedActors: string[];
  addBannedDirector: (name: string) => void;
  addBannedActor: (name: string) => void;

  // ── Tour ──────────────────────────────────────────────────────────────
  tourCompleted: boolean;
  setTourCompleted: () => void;
  resetTour: () => void;

  // ── Auth ──────────────────────────────────────────────────────────────
  setAuth: (data: { session_token: string; user_id: number; onboarding_complete: boolean }) => void;

  // ── Reset (logout) ────────────────────────────────────────────────────
  reset: () => void;
}

const useStore = create<StoreState>()(
  persist(
    (set) => ({
      userId: null,
      sessionToken: null,
      onboardingComplete: false,

      setUser: (user) =>
        set({
          userId: user.id,
          sessionToken: user.session_token,
        }),

      setOnboardingComplete: () => set({ onboardingComplete: true }),

      queue: [],
      currentIndex: 0,
      isLoadingRecs: false,

      setQueue: (items) => set({ queue: items, currentIndex: 0 }),
      appendQueue: (items) => set((s) => ({ queue: [...s.queue, ...items] })),
      advanceQueue: () => set((s) => ({ currentIndex: s.currentIndex + 1 })),
      setLoadingRecs: (val) => set({ isLoadingRecs: val }),

      platformFilter: [],
      setPlatformFilter: (platforms) => set({ platformFilter: platforms }),

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

      setAuth: (data) =>
        set({
          userId: data.user_id,
          sessionToken: data.session_token,
          onboardingComplete: data.onboarding_complete,
        }),

      tourCompleted: false,
      setTourCompleted: () => set({ tourCompleted: true }),
      resetTour: () => set({ tourCompleted: false }),

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
      name: "moviefinder-store",
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
);

export default useStore;
