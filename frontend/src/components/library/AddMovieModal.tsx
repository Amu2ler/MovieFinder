import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { searchMovies } from "../../api/client";
import StarRating from "./StarRating";
import type { LibraryEntryCreate, ListType, Movie } from "../../api/types";

interface AddMovieModalProps {
  onClose: () => void;
  onAdd: (body: LibraryEntryCreate) => Promise<void> | void;
}

export default function AddMovieModal({ onClose, onAdd }: AddMovieModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [selected, setSelected] = useState<Movie | null>(null);
  const [listType, setListType] = useState<ListType>("to_watch");
  const [rating, setRating] = useState(0);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchMovies(query.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSubmit = async () => {
    if (!selected && !query.trim()) return;
    if (listType === "watched" && rating === 0) return;

    setSubmitting(true);
    try {
      await onAdd({
        movie_id: selected?.id ?? null,
        custom_title: selected ? null : query.trim(),
        list_type: listType,
        rating: listType === "watched" ? rating : null,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="w-full max-w-md bg-[#0e0e1c] border border-white/8 rounded-2xl p-5 flex flex-col gap-4 pb-8 sm:pb-5 shadow-2xl"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold tracking-tight">Ajouter un film</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Titre du film…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              className="w-full bg-[#080810] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-brand-500 transition-colors"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {results.length > 0 && !selected && (
            <div className="flex flex-col gap-0.5 max-h-52 overflow-y-auto rounded-xl bg-[#080810] border border-white/8 p-1">
              {results.map((movie) => (
                <button
                  key={movie.id}
                  onClick={() => {
                    setSelected(movie);
                    setQuery(movie.title);
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/8 transition-colors text-left"
                >
                  <div className="text-left flex-1">
                    <p className="text-white text-sm font-medium">{movie.title}</p>
                    <p className="text-slate-500 text-xs">
                      {movie.year}
                      {movie.director ? ` · ${movie.director}` : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="flex items-center gap-3 px-3 py-2.5 bg-brand-500/10 border border-brand-500/25 rounded-xl">
              <div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
                <Check size={12} className="text-brand-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{selected.title}</p>
                <p className="text-slate-400 text-xs">
                  {selected.year} · {selected.director}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelected(null);
                  setQuery("");
                }}
                className="text-slate-600 hover:text-white transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div>
            <p className="text-slate-500 text-xs mb-2 uppercase tracking-wider">Ajouter à</p>
            <div className="flex gap-2">
              {([
                { value: "to_watch", label: "À voir" },
                { value: "watched", label: "Déjà vu" },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setListType(value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    listType === value
                      ? "bg-brand-500 text-white"
                      : "bg-white/5 text-slate-400 hover:bg-white/10 border border-white/8"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {listType === "watched" && (
            <div>
              <p className="text-slate-500 text-xs mb-2 uppercase tracking-wider">
                Note{" "}
                {rating === 0 && <span className="text-red-400 normal-case">(obligatoire)</span>}
              </p>
              <StarRating value={rating} onChange={setRating} />
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={
              submitting || (!selected && !query.trim()) || (listType === "watched" && rating === 0)
            }
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-brand-900/20"
          >
            {submitting ? "Ajout en cours…" : "Ajouter à ma liste"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
