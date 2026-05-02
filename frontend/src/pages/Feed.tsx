import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
} from "@dnd-kit/core";
import {
  Settings,
  RotateCcw,
  Plus,
  ChevronDown,
  ChevronRight,
  Film,
  Heart,
  List,
  Clapperboard,
  HelpCircle,
} from "lucide-react";
import useStore from "../store/useStore";
import { useFeed } from "../hooks/useFeed";
import { useLibrary } from "../hooks/useLibrary";
import MovieCard from "../components/MovieCard";
import SwipeButtons from "../components/SwipeButtons";
import WhyThisModal from "../components/WhyThisModal";
import FilterPanel from "../components/FilterPanel";
import { SidebarMovieCard, ColumnMovieCard } from "../components/library/LibraryMovieCard";
import AddMovieModal from "../components/library/AddMovieModal";
import AppTour from "../components/AppTour";
import type { LibraryEntry, ListType, Movie } from "../api/types";

type Tab = "liked" | "swipe" | "watchlist";

interface GenreGroupProps {
  genre: string;
  movies: Movie[];
}

function GenreGroup({ genre, movies }: GenreGroupProps) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-left"
      >
        {open ? (
          <ChevronDown size={13} className="text-slate-600 shrink-0" />
        ) : (
          <ChevronRight size={13} className="text-slate-600 shrink-0" />
        )}
        <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider flex-1 truncate">
          {genre}
        </span>
        <span className="text-slate-600 text-sm">{movies.length}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-1 mt-1 pl-1">
          {movies.map((movie) => (
            <SidebarMovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
}

interface DroppableSectionProps {
  id: ListType;
  title: string;
  entries: LibraryEntry[];
  onDelete: (entryId: number) => void;
  onRate: (entryId: number, rating: number) => void;
}

function DroppableSection({ id, title, entries, onDelete, onRate }: DroppableSectionProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className="flex-1 flex flex-col min-h-0 border-b border-white/5 last:border-b-0">
      <div
        className={`px-4 py-2.5 flex items-center justify-between shrink-0 border-b transition-colors ${
          isOver ? "border-brand-500/50" : "border-white/5"
        }`}
      >
        <span className="text-sm font-semibold text-slate-300 uppercase tracking-widest">
          {title}
        </span>
        <span className="text-sm text-slate-500 tabular-nums">{entries.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-3 transition-colors ${isOver ? "bg-brand-500/5" : ""}`}
      >
        {entries.length === 0 ? (
          <p className="text-slate-700 text-sm text-center py-10 select-none">Glisse un film ici</p>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((entry) => (
              <ColumnMovieCard key={entry.id} entry={entry} onDelete={onDelete} onRate={onRate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const TABS: { id: Tab; icon: typeof Heart; label: string }[] = [
  { id: "liked", icon: Heart, label: "Aimés" },
  { id: "swipe", icon: Clapperboard, label: "Découvrir" },
  { id: "watchlist", icon: List, label: "Ma liste" },
];

export default function Feed() {
  const { reset } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>("swipe");
  const [runTour, setRunTour] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const library = useLibrary();
  const feed = useFeed({ onLike: library.reload });

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const groupedLiked = library.library.liked.reduce<Record<string, Movie[]>>((acc, movie) => {
    const genre = movie.genres?.[0] || "Autre";
    if (!acc[genre]) acc[genre] = [];
    acc[genre].push(movie);
    return acc;
  }, {});

  return (
    <DndContext sensors={sensors} onDragStart={library.handleDndStart} onDragEnd={library.handleDndEnd}>
      <div className="h-[100dvh] overflow-hidden flex flex-col bg-[#080810]">
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* ── Left sidebar: Films aimés ──────────────────────────────────── */}
          <div
            id="tour-liked-sidebar"
            className={`
              flex-col border-r border-white/6 bg-[#0e0e1c] h-full
              w-full lg:w-80 lg:shrink-0
              ${activeTab === "liked" ? "flex" : "hidden"} lg:flex
            `}
          >
            <div className="px-5 py-4 border-b border-white/6 shrink-0">
              <p className="text-white text-sm font-semibold tracking-wide">Films aimés</p>
              <p className="text-slate-500 text-sm mt-0.5">
                {library.library.liked.length} film
                {library.library.liked.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {library.library.liked.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                  <Heart size={32} className="text-slate-700 mb-3" />
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Aimez des films pour les retrouver ici
                  </p>
                </div>
              ) : (
                Object.entries(groupedLiked).map(([genre, movies]) => (
                  <GenreGroup key={genre} genre={genre} movies={movies} />
                ))
              )}
            </div>
          </div>

          {/* ── Centre: swipe feed ─────────────────────────────────────────── */}
          <div
            className={`
              flex-col items-center px-4 pt-5 pb-4 overflow-hidden
              flex-1 min-w-0
              ${activeTab === "swipe" ? "flex" : "hidden"} lg:flex
            `}
          >
            <div
              id="tour-header"
              className="w-full max-w-md flex items-center justify-between mb-4 shrink-0"
            >
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Movie<span className="text-brand-400">Finder</span>
                </h1>
                <p className="text-slate-500 text-xs mt-0.5">
                  {feed.likeCount} film{feed.likeCount !== 1 ? "s" : ""} aimé
                  {feed.likeCount !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {feed.current?.is_exploration && (
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full text-xs border border-purple-500/20">
                    Découverte
                  </span>
                )}
                <button
                  id="tour-help-btn"
                  onClick={() => setRunTour(true)}
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  aria-label="Aide"
                  title="Tour des fonctionnalités"
                >
                  <HelpCircle size={16} />
                </button>
                <button
                  id="tour-filter-btn"
                  onClick={() => setShowFilter(true)}
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  aria-label="Filtres"
                >
                  <Settings size={16} />
                </button>
                <button
                  onClick={() => {
                    reset();
                    window.location.reload();
                  }}
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  aria-label="Nouveau profil"
                  title="Nouveau profil"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>

            {feed.loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-500 text-sm">Calcul de vos recommandations…</p>
                </div>
              </div>
            ) : feed.error ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <p className="text-red-400 mb-4">{feed.error}</p>
                  <button
                    onClick={feed.loadRecs}
                    className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div id="tour-swipe-card" className="w-full max-w-md flex-1 relative min-h-0">
                  {feed.nextCard && (
                    <div className="absolute inset-0 scale-95 opacity-40 pointer-events-none">
                      <MovieCard movie={feed.nextCard.movie} overlayState={null} />
                    </div>
                  )}
                  <AnimatePresence mode="wait">
                    {feed.current ? (
                      <motion.div
                        key={feed.current.movie.id}
                        className="absolute inset-0 cursor-grab active:cursor-grabbing"
                        style={{ x: feed.x, rotate: feed.rotate, opacity: feed.cardOpacity }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.8}
                        onDrag={feed.handleDrag}
                        onDragEnd={feed.handleDragEnd}
                        initial={{ scale: 0.92, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.88 }}
                        transition={{ duration: 0.3 }}
                      >
                        <MovieCard movie={feed.current.movie} overlayState={feed.overlayState} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        className="absolute inset-0 flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="text-center">
                          <Film size={40} className="text-slate-700 mx-auto mb-3" />
                          <p className="text-white font-semibold mb-2">
                            Plus de films pour l&apos;instant
                          </p>
                          <button
                            onClick={feed.loadRecs}
                            className="px-4 py-2 bg-brand-500 text-white rounded-xl text-sm hover:bg-brand-600 transition-colors"
                          >
                            Charger plus
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <p className="text-slate-700 text-xs mt-2 mb-1 shrink-0">
                  Glisse à gauche pour ignorer · à droite pour aimer
                </p>

                <div id="tour-swipe-buttons">
                  <SwipeButtons
                    onLike={() => feed.handleAction("like")}
                    onDislike={() => feed.handleAction("dislike")}
                    onWhyThis={feed.handleWhyThis}
                    disabled={feed.sending || !feed.current}
                  />
                </div>
              </>
            )}
          </div>

          {/* ── Right panel: Ma liste ──────────────────────────────────────── */}
          <div
            id="tour-watchlist"
            className={`
              flex-col border-l border-white/6 bg-[#0e0e1c] h-full
              w-full lg:w-80 lg:shrink-0
              ${activeTab === "watchlist" ? "flex" : "hidden"} lg:flex
            `}
          >
            <div className="px-5 py-4 border-b border-white/6 shrink-0">
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-brand-900/30"
              >
                <Plus size={15} />
                Ajouter un film
              </button>
            </div>
            <DroppableSection
              id="to_watch"
              title="À voir"
              entries={library.library.to_watch}
              onDelete={library.deleteEntry}
              onRate={library.rateEntry}
            />
            <DroppableSection
              id="watched"
              title="Déjà vu"
              entries={library.library.watched}
              onDelete={library.deleteEntry}
              onRate={library.rateEntry}
            />
          </div>
        </div>

        <nav className="lg:hidden flex items-stretch border-t border-white/8 bg-[#0a0a16] shrink-0">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
                activeTab === id ? "text-brand-400" : "text-slate-600 hover:text-slate-400"
              }`}
            >
              <Icon size={22} strokeWidth={activeTab === id ? 2.2 : 1.8} />
              <span className="text-[11px] font-medium tracking-wide">{label}</span>
            </button>
          ))}
        </nav>

        <DragOverlay dropAnimation={null}>
          {library.activeDrag ? (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#16162a] border border-brand-500/40 shadow-2xl w-52 opacity-90">
              <div className="w-9 h-12 rounded bg-white/10 shrink-0 overflow-hidden">
                {library.activeDrag.poster_url && (
                  <img
                    src={library.activeDrag.poster_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <p className="text-white text-sm font-medium truncate">{library.activeDrag.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </div>

      {feed.whyData && <WhyThisModal data={feed.whyData} onClose={feed.closeWhyData} />}
      {showFilter && (
        <FilterPanel
          onClose={() => {
            setShowFilter(false);
            feed.loadRecs();
          }}
        />
      )}
      {showAddModal && (
        <AddMovieModal onClose={() => setShowAddModal(false)} onAdd={library.addEntry} />
      )}

      <AppTour run={runTour || undefined} onFinish={() => setRunTour(false)} />
    </DndContext>
  );
}
