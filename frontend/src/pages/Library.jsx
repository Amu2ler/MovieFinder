import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DndContext, DragOverlay, useDroppable } from "@dnd-kit/core";
import useStore from "../store/useStore";
import { getLibrary, addLibraryEntry, updateLibraryEntry, deleteLibraryEntry } from "../api/client";
import { SidebarMovieCard, ColumnMovieCard } from "../components/library/LibraryMovieCard";
import AddMovieModal from "../components/library/AddMovieModal";

// ── Droppable column ───────────────────────────────────────────────────────────
function DroppableColumn({ id, title, entries, onDelete, onRate, emptyLabel }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col flex-1 min-w-0 rounded-2xl border transition-colors ${
        isOver ? "border-brand-500/60 bg-brand-500/5" : "border-white/5 bg-white/3"
      }`}
    >
      <div className="px-4 pt-4 pb-3 border-b border-white/5">
        <h2 className="text-white font-semibold text-sm">{title}</h2>
        <p className="text-slate-500 text-xs mt-0.5">
          {entries.length} film{entries.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="flex flex-col gap-2 p-3 overflow-y-auto flex-1">
        {entries.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-10">
            <p className="text-slate-600 text-xs text-center">{emptyLabel}</p>
          </div>
        ) : (
          entries.map((entry) => (
            <ColumnMovieCard key={entry.id} entry={entry} onDelete={onDelete} onRate={onRate} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Genre group in sidebar ────────────────────────────────────────────────────
function GenreGroup({ genre, movies }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-2 py-1.5 text-left hover:bg-white/5 rounded-lg transition-colors"
      >
        <span className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
          {genre} ({movies.length})
        </span>
        <span className="text-slate-600 text-xs">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-1 mt-1">
          {movies.map((movie) => (
            <SidebarMovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Library page ─────────────────────────────────────────────────────────
export default function Library() {
  const { userId } = useStore();
  const navigate = useNavigate();

  const [library, setLibrary] = useState({ liked: [], to_watch: [], watched: [] });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeMovie, setActiveMovie] = useState(null); // movie being dragged (for overlay)

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLibrary(userId);
      setLibrary(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  // Group liked movies by primary genre
  const groupedLiked = library.liked.reduce((acc, movie) => {
    const genre = movie.genres?.[0] || "Autre";
    if (!acc[genre]) acc[genre] = [];
    acc[genre].push(movie);
    return acc;
  }, {});

  const handleDragStart = (event) => {
    const { data } = event.active;
    if (data.current?.source === "sidebar") {
      setActiveMovie(data.current.movie);
    } else if (data.current?.source === "column") {
      setActiveMovie(data.current.entry?.movie || null);
    }
  };

  const handleDragEnd = async (event) => {
    setActiveMovie(null);
    const { active, over } = event;
    if (!over) return;

    const targetColumn = over.id; // 'to_watch' or 'watched'
    const source = active.data.current?.source;

    if (source === "sidebar") {
      // Drag from liked sidebar → add to column
      const movie = active.data.current.movie;
      // Check not already in list
      const alreadyIn = [...library.to_watch, ...library.watched].find(
        (e) => e.movie_id === movie.id
      );
      if (alreadyIn) {
        if (alreadyIn.list_type === targetColumn) return;
        // Move between columns
        try {
          const updated = await updateLibraryEntry(userId, alreadyIn.id, {
            list_type: targetColumn,
          });
          setLibrary((prev) => ({
            ...prev,
            to_watch: prev.to_watch.filter((e) => e.id !== alreadyIn.id),
            watched: prev.watched.filter((e) => e.id !== alreadyIn.id),
            [targetColumn]: [...prev[targetColumn], updated],
          }));
        } catch {
          /* ignore */
        }
        return;
      }
      try {
        const entry = await addLibraryEntry(userId, {
          movie_id: movie.id,
          list_type: targetColumn,
        });
        setLibrary((prev) => ({
          ...prev,
          [targetColumn]: [...prev[targetColumn], entry],
        }));
      } catch {
        /* ignore */
      }
    } else if (source === "column") {
      // Drag between columns
      const entry = active.data.current.entry;
      if (entry.list_type === targetColumn) return;
      try {
        const updated = await updateLibraryEntry(userId, entry.id, { list_type: targetColumn });
        setLibrary((prev) => ({
          ...prev,
          to_watch: prev.to_watch.filter((e) => e.id !== entry.id),
          watched: prev.watched.filter((e) => e.id !== entry.id),
          [targetColumn]: [...prev[targetColumn], updated],
        }));
      } catch {
        /* ignore */
      }
    }
  };

  const handleDelete = async (entryId) => {
    try {
      await deleteLibraryEntry(userId, entryId);
      setLibrary((prev) => ({
        ...prev,
        to_watch: prev.to_watch.filter((e) => e.id !== entryId),
        watched: prev.watched.filter((e) => e.id !== entryId),
      }));
    } catch {
      /* ignore */
    }
  };

  const handleRate = async (entryId, rating) => {
    try {
      const updated = await updateLibraryEntry(userId, entryId, { rating });
      setLibrary((prev) => ({
        ...prev,
        watched: prev.watched.map((e) => (e.id === entryId ? updated : e)),
      }));
    } catch {
      /* ignore */
    }
  };

  const handleAdd = async (body) => {
    const entry = await addLibraryEntry(userId, body);
    setLibrary((prev) => ({
      ...prev,
      [body.list_type]: [...prev[body.list_type], entry],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/feed")}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            ← Feed
          </button>
          <h1 className="text-white font-bold text-lg">Ma Bibliothèque</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <span>+</span>
          <span>Ajouter un film</span>
        </button>
      </div>

      {/* Main content */}
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar — Liked movies */}
          <div className="w-64 shrink-0 border-r border-white/5 flex flex-col">
            <div className="px-4 pt-4 pb-2 border-b border-white/5">
              <h2 className="text-white font-semibold text-sm">Films aimés</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                {library.liked.length} film{library.liked.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {library.liked.length === 0 ? (
                <p className="text-slate-600 text-xs text-center mt-8">
                  Aimez des films dans le feed pour les voir ici
                </p>
              ) : (
                Object.entries(groupedLiked).map(([genre, movies]) => (
                  <GenreGroup key={genre} genre={genre} movies={movies} />
                ))
              )}
            </div>
          </div>

          {/* Right — two columns */}
          <div className="flex flex-1 gap-4 p-4 overflow-hidden">
            <DroppableColumn
              id="to_watch"
              title="📋 À voir"
              entries={library.to_watch}
              onDelete={handleDelete}
              onRate={handleRate}
              emptyLabel="Glisse un film ici pour l'ajouter à ta liste"
            />
            <DroppableColumn
              id="watched"
              title="✅ Déjà vu"
              entries={library.watched}
              onDelete={handleDelete}
              onRate={handleRate}
              emptyLabel="Glisse un film ici une fois regardé"
            />
          </div>
        </div>

        {/* Drag overlay (ghost image while dragging) */}
        <DragOverlay>
          {activeMovie ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#16161e] border border-brand-500/40 shadow-2xl opacity-90 w-56">
              <div className="w-8 h-12 rounded bg-white/10 shrink-0 overflow-hidden">
                {activeMovie.poster_url && (
                  <img
                    src={activeMovie.poster_url}
                    alt={activeMovie.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <p className="text-white text-xs font-medium truncate">{activeMovie.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add Movie Modal */}
      {showAddModal && <AddMovieModal onClose={() => setShowAddModal(false)} onAdd={handleAdd} />}
    </div>
  );
}
