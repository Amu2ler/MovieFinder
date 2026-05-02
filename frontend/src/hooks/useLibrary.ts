import { useCallback, useEffect, useState } from "react";
import {
  addLibraryEntry,
  deleteLibraryEntry,
  getLibrary,
  updateLibraryEntry,
} from "../api/client";
import { notifyError } from "../lib/notify";
import type {
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import type {
  LibraryEntry,
  LibraryEntryCreate,
  LibraryResponse,
  ListType,
  Movie,
} from "../api/types";

const EMPTY_LIBRARY: LibraryResponse = { liked: [], to_watch: [], watched: [] };

/** Discriminated payload attached to draggable items. */
export type DragData =
  | { source: "sidebar"; movie: Movie }
  | { source: "column"; entry: LibraryEntry };

export interface UseLibraryResult {
  library: LibraryResponse;
  activeDrag: Movie | null;

  reload: () => Promise<void>;
  addEntry: (body: LibraryEntryCreate) => Promise<void>;
  deleteEntry: (entryId: number) => Promise<void>;
  rateEntry: (entryId: number, rating: number) => Promise<void>;

  handleDndStart: (event: DragStartEvent) => void;
  handleDndEnd: (event: DragEndEvent) => Promise<void>;
}

/**
 * Owns the user's library (liked / to_watch / watched), all CRUD on entries,
 * and the drag-and-drop wiring between the liked sidebar and the two columns.
 *
 * Optimistic updates aren't done — the server is the source of truth and the
 * UI re-syncs on every mutation result.
 */
export function useLibrary(): UseLibraryResult {
  const [library, setLibrary] = useState<LibraryResponse>(EMPTY_LIBRARY);
  const [activeDrag, setActiveDrag] = useState<Movie | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await getLibrary();
      setLibrary(data);
    } catch {
      notifyError("Bibliothèque indisponible.");
    }
  }, []);

  useEffect(() => {
    // Initial fetch: reload setState on mount is the intended behaviour here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const addEntry = useCallback(async (body: LibraryEntryCreate) => {
    try {
      const entry = await addLibraryEntry(body);
      setLibrary((prev) => ({
        ...prev,
        [body.list_type]: [...prev[body.list_type], entry],
      }));
    } catch {
      notifyError("Ajout impossible.");
    }
  }, []);

  const deleteEntry = useCallback(async (entryId: number) => {
    try {
      await deleteLibraryEntry(entryId);
      setLibrary((prev) => ({
        ...prev,
        to_watch: prev.to_watch.filter((e) => e.id !== entryId),
        watched: prev.watched.filter((e) => e.id !== entryId),
      }));
    } catch {
      notifyError("Suppression impossible.");
    }
  }, []);

  const rateEntry = useCallback(async (entryId: number, rating: number) => {
    try {
      const updated = await updateLibraryEntry(entryId, { rating });
      setLibrary((prev) => ({
        ...prev,
        watched: prev.watched.map((e) => (e.id === entryId ? updated : e)),
      }));
    } catch {
      notifyError("Note non sauvegardée.");
    }
  }, []);

  const handleDndStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragData | undefined;
    if (!data) return setActiveDrag(null);
    if (data.source === "sidebar") setActiveDrag(data.movie);
    else setActiveDrag(data.entry.movie ?? null);
  }, []);

  const handleDndEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveDrag(null);
      const { active, over } = event;
      if (!over) return;
      const targetColumn = over.id as ListType;
      const data = active.data.current as DragData | undefined;
      if (!data) return;

      if (data.source === "sidebar") {
        const movie = data.movie;
        const existing = [...library.to_watch, ...library.watched].find(
          (e) => e.movie_id === movie.id
        );
        if (existing) {
          if (existing.list_type === targetColumn) return;
          try {
            const updated = await updateLibraryEntry(existing.id, {
              list_type: targetColumn,
            });
            setLibrary((prev) => ({
              ...prev,
              to_watch: prev.to_watch.filter((e) => e.id !== existing.id),
              watched: prev.watched.filter((e) => e.id !== existing.id),
              [targetColumn]: [...prev[targetColumn], updated],
            }));
          } catch {
            notifyError("Déplacement impossible.");
          }
          return;
        }
        try {
          const entry = await addLibraryEntry({ movie_id: movie.id, list_type: targetColumn });
          setLibrary((prev) => ({
            ...prev,
            [targetColumn]: [...prev[targetColumn], entry],
          }));
        } catch {
          notifyError("Ajout impossible.");
        }
      } else {
        const entry = data.entry;
        if (entry.list_type === targetColumn) return;
        try {
          const updated = await updateLibraryEntry(entry.id, { list_type: targetColumn });
          setLibrary((prev) => ({
            ...prev,
            to_watch: prev.to_watch.filter((e) => e.id !== entry.id),
            watched: prev.watched.filter((e) => e.id !== entry.id),
            [targetColumn]: [...prev[targetColumn], updated],
          }));
        } catch {
          notifyError("Déplacement impossible.");
        }
      }
    },
    [library.to_watch, library.watched]
  );

  return {
    library,
    activeDrag,
    reload,
    addEntry,
    deleteEntry,
    rateEntry,
    handleDndStart,
    handleDndEnd,
  };
}
