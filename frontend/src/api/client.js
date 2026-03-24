import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// ── Users ────────────────────────────────────────────────────────────────────
export const createUser = () => api.post("/users").then((r) => r.data);
export const getUser = (userId) => api.get(`/users/${userId}`).then((r) => r.data);
export const addHate = (userId, type, name) =>
  api.patch(`/users/${userId}/hate`, { type, name }).then((r) => r.data);

// ── Movies ───────────────────────────────────────────────────────────────────
export const getOnboardingMovies = () => api.get("/movies/onboarding").then((r) => r.data);
export const getMovie = (movieId) => api.get(`/movies/${movieId}`).then((r) => r.data);
export const searchMovies = (q) => api.get("/movies/search", { params: { q } }).then((r) => r.data);

// ── Interactions ─────────────────────────────────────────────────────────────
export const sendInteraction = (userId, movieId, action) =>
  api.post("/interactions", { user_id: userId, movie_id: movieId, action }).then((r) => r.data);

// ── Recommendations ───────────────────────────────────────────────────────────
export const getRecommendations = (userId, { platforms = [], limit = 20 } = {}) =>
  api
    .get(`/recommendations/${userId}`, {
      params: { platforms: platforms.join(","), limit },
    })
    .then((r) => r.data);

export const getWhyThis = (userId, movieId) =>
  api.get(`/recommendations/${userId}/why/${movieId}`).then((r) => r.data);

// ── Library ───────────────────────────────────────────────────────────────────
export const getLibrary = (userId) => api.get(`/library/${userId}`).then((r) => r.data);
export const addLibraryEntry = (userId, body) =>
  api.post(`/library/${userId}/entries`, body).then((r) => r.data);
export const updateLibraryEntry = (userId, entryId, body) =>
  api.patch(`/library/${userId}/entries/${entryId}`, body).then((r) => r.data);
export const deleteLibraryEntry = (userId, entryId) =>
  api.delete(`/library/${userId}/entries/${entryId}`);

export default api;
