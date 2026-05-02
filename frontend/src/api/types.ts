/**
 * Re-export the auto-generated OpenAPI schemas with friendlier names.
 * Source of truth: ../api/schema.d.ts (regenerate with `npm run gen:api`).
 */

import type { components } from "./schema";

export type Movie = components["schemas"]["MovieResponse"];
export type UserPublic = components["schemas"]["UserPublic"];
export type UserCreateResponse = components["schemas"]["UserCreateResponse"];
export type HateRequest = components["schemas"]["HateRequest"];
export type HateType = HateRequest["type"];
export type InteractionCreate = components["schemas"]["InteractionCreate"];
export type InteractionAction = InteractionCreate["action"];
export type RecommendationItem = components["schemas"]["RecommendationItem"];
export type WhyThisResponse = components["schemas"]["WhyThisResponse"];
export type LibraryResponse = components["schemas"]["LibraryResponse"];
export type LibraryEntry = components["schemas"]["LibraryEntryResponse"];
export type LibraryEntryCreate = components["schemas"]["LibraryEntryCreate"];
export type LibraryEntryUpdate = components["schemas"]["LibraryEntryUpdate"];
export type ListType = NonNullable<LibraryEntryUpdate["list_type"]>;
