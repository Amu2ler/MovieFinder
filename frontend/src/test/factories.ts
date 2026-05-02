/**
 * Tiny test-data factories. Keep these dumb — anything fancier breaks the
 * "what you read is what you get" promise that makes failing tests easy to debug.
 */

import type { LibraryEntry, Movie, RecommendationItem } from "../api/types";

export const makeMovie = (overrides: Partial<Movie> = {}): Movie => ({
  id: 1,
  tmdb_id: 100,
  title: "Test Movie",
  year: 2020,
  director: "Test Director",
  director_id: "test_director",
  cast: ["Actor One", "Actor Two"],
  genres: ["Drama"],
  synopsis: "A test movie.",
  poster_url: null,
  streaming_platforms: ["Netflix"],
  avg_rating: 7.5,
  is_onboarding: false,
  ...overrides,
});

export const makeRec = (
  movieOverrides: Partial<Movie> = {},
  recOverrides: Partial<RecommendationItem> = {}
): RecommendationItem => ({
  movie: makeMovie(movieOverrides),
  score: 0.8,
  is_exploration: false,
  ...recOverrides,
});

export const makeEntry = (overrides: Partial<LibraryEntry> = {}): LibraryEntry => ({
  id: 1,
  user_id: 1,
  movie_id: 1,
  custom_title: null,
  list_type: "to_watch",
  rating: null,
  position: 0,
  movie: makeMovie(),
  ...overrides,
});
