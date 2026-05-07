import axios, { AxiosError } from "axios";
import useStore from "../store/useStore";
import { notifyError } from "../lib/notify";
import type {
  HateType,
  InteractionAction,
  LibraryEntry,
  LibraryEntryCreate,
  LibraryEntryUpdate,
  LibraryResponse,
  Movie,
  RecommendationItem,
  UserCreateResponse,
  UserPublic,
  WhyThisResponse,
} from "./types";

const getApiBase = (): string => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL as string;
  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:8000";
  return `${origin}/api`;
};

const API_BASE = getApiBase();

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Inject the Bearer token from the store on every request
api.interceptors.request.use((config) => {
  const token = useStore.getState().sessionToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Visible error handling for non-recoverable failures
api.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    const status = err.response?.status;
    if (status === 401) {
      const { sessionToken, reset } = useStore.getState();
      if (sessionToken) {
        reset();
        if (typeof window !== "undefined") window.location.reload();
      }
    } else if (status === 429) {
      notifyError("Trop de requêtes — patiente quelques secondes.");
    } else if (status !== undefined && status >= 500) {
      notifyError("Le serveur a rencontré une erreur. Réessaie.");
    } else if (!err.response) {
      notifyError("Connexion au serveur impossible.");
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthResponse {
  session_token: string;
  user_id: number;
}

export const login = (email: string, password: string): Promise<AuthResponse> =>
  api.post<AuthResponse>("/auth/login", { email, password }).then((r) => r.data);

export const register = (email: string, password: string): Promise<AuthResponse> =>
  api.post<AuthResponse>("/auth/register", { email, password }).then((r) => r.data);

// ── Users ────────────────────────────────────────────────────────────────────
export const createUser = (): Promise<UserCreateResponse> =>
  api.post<UserCreateResponse>("/users").then((r) => r.data);

export const getMe = (): Promise<UserPublic> =>
  api.get<UserPublic>("/users/me").then((r) => r.data);

export const addHate = (type: HateType, name: string): Promise<UserPublic> =>
  api.patch<UserPublic>("/users/me/hate", { type, name }).then((r) => r.data);

// ── Movies ───────────────────────────────────────────────────────────────────
export const getOnboardingMovies = (): Promise<Movie[]> =>
  api.get<Movie[]>("/movies/onboarding").then((r) => r.data);

export const getMovie = (movieId: number): Promise<Movie> =>
  api.get<Movie>(`/movies/${movieId}`).then((r) => r.data);

export const searchMovies = (q: string): Promise<Movie[]> =>
  api.get<Movie[]>("/movies/search", { params: { q } }).then((r) => r.data);

// ── Interactions ─────────────────────────────────────────────────────────────
export const sendInteraction = (movieId: number, action: InteractionAction) =>
  api.post("/interactions", { movie_id: movieId, action }).then((r) => r.data);

// ── Recommendations ───────────────────────────────────────────────────────────
export interface GetRecommendationsOpts {
  platforms?: string[];
  limit?: number;
}

export const getRecommendations = ({
  platforms = [],
  limit = 20,
}: GetRecommendationsOpts = {}): Promise<RecommendationItem[]> =>
  api
    .get<RecommendationItem[]>("/recommendations", {
      params: { platforms: platforms.join(","), limit },
    })
    .then((r) => r.data);

export const getWhyThis = (movieId: number): Promise<WhyThisResponse> =>
  api.get<WhyThisResponse>(`/recommendations/why/${movieId}`).then((r) => r.data);

// ── Library ───────────────────────────────────────────────────────────────────
export const getLibrary = (): Promise<LibraryResponse> =>
  api.get<LibraryResponse>("/library").then((r) => r.data);

export const addLibraryEntry = (body: LibraryEntryCreate): Promise<LibraryEntry> =>
  api.post<LibraryEntry>("/library/entries", body).then((r) => r.data);

export const updateLibraryEntry = (
  entryId: number,
  body: LibraryEntryUpdate
): Promise<LibraryEntry> =>
  api.patch<LibraryEntry>(`/library/entries/${entryId}`, body).then((r) => r.data);

export const deleteLibraryEntry = (entryId: number): Promise<void> =>
  api.delete(`/library/entries/${entryId}`).then(() => undefined);

export default api;
