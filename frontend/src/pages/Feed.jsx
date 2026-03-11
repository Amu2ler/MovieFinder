import React, { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
} from '@dnd-kit/core'
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
} from 'lucide-react'
import {
  getRecommendations,
  sendInteraction,
  getWhyThis,
  getLibrary,
  addLibraryEntry,
  updateLibraryEntry,
  deleteLibraryEntry,
} from '../api/client'
import useStore from '../store/useStore'
import MovieCard from '../components/MovieCard'
import SwipeButtons from '../components/SwipeButtons'
import WhyThisModal from '../components/WhyThisModal'
import FilterPanel from '../components/FilterPanel'
import { SidebarMovieCard, ColumnMovieCard } from '../components/library/LibraryMovieCard'
import AddMovieModal from '../components/library/AddMovieModal'
import AppTour from '../components/AppTour'

// ── Genre group (left sidebar) ─────────────────────────────────────────────────
function GenreGroup({ genre, movies }) {
  const [open, setOpen] = useState(true)
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
  )
}

// ── Droppable section (right panel) ───────────────────────────────────────────
function DroppableSection({ id, title, entries, onDelete, onRate }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div className="flex-1 flex flex-col min-h-0 border-b border-white/5 last:border-b-0">
      <div
        className={`px-4 py-2.5 flex items-center justify-between shrink-0 border-b transition-colors ${
          isOver ? 'border-brand-500/50' : 'border-white/5'
        }`}
      >
        <span className="text-sm font-semibold text-slate-300 uppercase tracking-widest">
          {title}
        </span>
        <span className="text-sm text-slate-500 tabular-nums">{entries.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-3 transition-colors ${
          isOver ? 'bg-brand-500/5' : ''
        }`}
      >
        {entries.length === 0 ? (
          <p className="text-slate-700 text-sm text-center py-10 select-none">
            Glisse un film ici
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((entry) => (
              <ColumnMovieCard
                key={entry.id}
                entry={entry}
                onDelete={onDelete}
                onRate={onRate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Feed page ──────────────────────────────────────────────────────────────────
export default function Feed() {
  const { userId, platformFilter, reset, tourCompleted } = useStore()
  const [runTour, setRunTour] = useState(false)

  // ── Mobile tab state ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('swipe') // 'liked' | 'swipe' | 'watchlist'

  // ── Swipe state ──────────────────────────────────────────────────────────────
  const [queue, setQueue] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [whyData, setWhyData] = useState(null)
  const [showFilter, setShowFilter] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [overlayState, setOverlayState] = useState(null)
  const [error, setError] = useState(null)

  // ── Library state ────────────────────────────────────────────────────────────
  const [library, setLibrary] = useState({ liked: [], to_watch: [], watched: [] })
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeDrag, setActiveDrag] = useState(null)

  // ── DnD sensors ──────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  // ── Drag motion values ───────────────────────────────────────────────────────
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-18, 18])
  const cardOpacity = useTransform(x, [-200, -100, 0, 100, 200], [0.4, 1, 1, 1, 0.4])

  // ── Load recommendations ─────────────────────────────────────────────────────
  const loadRecs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getRecommendations(userId, { platforms: platformFilter, limit: 20 })
      setQueue(data)
      setCurrentIdx(0)
    } catch {
      setError('Impossible de charger les recommandations.')
    } finally {
      setLoading(false)
    }
  }, [userId, platformFilter])

  useEffect(() => { loadRecs() }, [loadRecs])

  // ── Load library ─────────────────────────────────────────────────────────────
  const loadLibrary = useCallback(async () => {
    try {
      const data = await getLibrary(userId)
      setLibrary(data)
    } catch {}
  }, [userId])

  useEffect(() => { loadLibrary() }, [loadLibrary])

  const current = queue[currentIdx]
  const nextCard = queue[currentIdx + 1]

  // ── Swipe handlers ───────────────────────────────────────────────────────────
  const handleAction = useCallback(
    async (action) => {
      if (sending || !current) return
      setSending(true)
      setOverlayState(action)
      try {
        await sendInteraction(userId, current.movie.id, action)
        if (action === 'like') {
          setLikeCount((n) => n + 1)
          loadLibrary()
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 350))
      x.set(0)
      setOverlayState(null)
      if (currentIdx + 1 >= queue.length) {
        await loadRecs()
      } else {
        setCurrentIdx((i) => i + 1)
      }
      setSending(false)
    },
    [sending, current, currentIdx, queue.length, userId, x, loadRecs, loadLibrary]
  )

  const handleWhyThis = async () => {
    if (!current) return
    try {
      const data = await getWhyThis(userId, current.movie.id)
      setWhyData(data)
    } catch {
      setWhyData({ movie_title: current.movie.title, reasons: ['Recommandation basée sur votre profil.'] })
    }
  }

  const handleDragEnd = (_, info) => {
    const threshold = 100
    if (info.offset.x > threshold) handleAction('like')
    else if (info.offset.x < -threshold) handleAction('dislike')
    else { x.set(0); setOverlayState(null) }
  }

  const handleDrag = (_, info) => {
    if (info.offset.x > 60) setOverlayState('like')
    else if (info.offset.x < -60) setOverlayState('dislike')
    else setOverlayState(null)
  }

  // ── Library DnD handlers ─────────────────────────────────────────────────────
  const handleDndStart = (event) => {
    const d = event.active.data.current
    setActiveDrag(d?.movie || d?.entry?.movie || null)
  }

  const handleDndEnd = async (event) => {
    setActiveDrag(null)
    const { active, over } = event
    if (!over) return
    const targetColumn = over.id
    const source = active.data.current?.source

    if (source === 'sidebar') {
      const movie = active.data.current.movie
      const existing = [...library.to_watch, ...library.watched].find(
        (e) => e.movie_id === movie.id
      )
      if (existing) {
        if (existing.list_type === targetColumn) return
        try {
          const updated = await updateLibraryEntry(userId, existing.id, { list_type: targetColumn })
          setLibrary((prev) => ({
            ...prev,
            to_watch: prev.to_watch.filter((e) => e.id !== existing.id),
            watched: prev.watched.filter((e) => e.id !== existing.id),
            [targetColumn]: [...prev[targetColumn], updated],
          }))
        } catch {}
        return
      }
      try {
        const entry = await addLibraryEntry(userId, { movie_id: movie.id, list_type: targetColumn })
        setLibrary((prev) => ({
          ...prev,
          [targetColumn]: [...prev[targetColumn], entry],
        }))
      } catch {}
    } else if (source === 'column') {
      const entry = active.data.current.entry
      if (entry.list_type === targetColumn) return
      try {
        const updated = await updateLibraryEntry(userId, entry.id, { list_type: targetColumn })
        setLibrary((prev) => ({
          ...prev,
          to_watch: prev.to_watch.filter((e) => e.id !== entry.id),
          watched: prev.watched.filter((e) => e.id !== entry.id),
          [targetColumn]: [...prev[targetColumn], updated],
        }))
      } catch {}
    }
  }

  const handleDeleteEntry = async (entryId) => {
    try {
      await deleteLibraryEntry(userId, entryId)
      setLibrary((prev) => ({
        ...prev,
        to_watch: prev.to_watch.filter((e) => e.id !== entryId),
        watched: prev.watched.filter((e) => e.id !== entryId),
      }))
    } catch {}
  }

  const handleRateEntry = async (entryId, rating) => {
    try {
      const updated = await updateLibraryEntry(userId, entryId, { rating })
      setLibrary((prev) => ({
        ...prev,
        watched: prev.watched.map((e) => (e.id === entryId ? updated : e)),
      }))
    } catch {}
  }

  const handleAddMovie = async (body) => {
    const entry = await addLibraryEntry(userId, body)
    setLibrary((prev) => ({
      ...prev,
      [body.list_type]: [...prev[body.list_type], entry],
    }))
  }

  const groupedLiked = library.liked.reduce((acc, movie) => {
    const genre = movie.genres?.[0] || 'Autre'
    if (!acc[genre]) acc[genre] = []
    acc[genre].push(movie)
    return acc
  }, {})

  // ── Sidebar header (reused on mobile and desktop) ────────────────────────────
  const SidebarHeader = () => (
    <div className="px-5 py-4 border-b border-white/6 shrink-0">
      <p className="text-white text-sm font-semibold tracking-wide">Films aimés</p>
      <p className="text-slate-500 text-sm mt-0.5">
        {library.liked.length} film{library.liked.length !== 1 ? 's' : ''}
      </p>
    </div>
  )

  const WatchlistHeader = () => (
    <div className="px-5 py-4 border-b border-white/6 shrink-0">
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-brand-900/30"
      >
        <Plus size={15} />
        Ajouter un film
      </button>
    </div>
  )

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <DndContext sensors={sensors} onDragStart={handleDndStart} onDragEnd={handleDndEnd}>
      <div className="h-[100dvh] overflow-hidden flex flex-col bg-[#080810]">

        {/* ── Main panels row ───────────────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden min-h-0">

          {/* ── Left sidebar: Films aimés ──────────────────────────────────── */}
          <div
            id="tour-liked-sidebar"
            className={`
              flex-col border-r border-white/6 bg-[#0e0e1c] h-full
              w-full lg:w-80 lg:shrink-0
              ${activeTab === 'liked' ? 'flex' : 'hidden'} lg:flex
            `}
          >
            <SidebarHeader />
            <div className="flex-1 overflow-y-auto p-3">
              {library.liked.length === 0 ? (
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
              ${activeTab === 'swipe' ? 'flex' : 'hidden'} lg:flex
            `}
          >
            {/* Header */}
            <div id="tour-header" className="w-full max-w-md flex items-center justify-between mb-4 shrink-0">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Movie<span className="text-brand-400">Finder</span>
                </h1>
                <p className="text-slate-500 text-xs mt-0.5">
                  {likeCount} film{likeCount !== 1 ? 's' : ''} aimé{likeCount !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {current?.is_exploration && (
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
                  onClick={() => { reset(); window.location.reload() }}
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  aria-label="Nouveau profil"
                  title="Nouveau profil"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>

            {/* Card stack */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-500 text-sm">Calcul de vos recommandations…</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <p className="text-red-400 mb-4">{error}</p>
                  <button
                    onClick={loadRecs}
                    className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div id="tour-swipe-card" className="w-full max-w-md flex-1 relative min-h-0">
                  {nextCard && (
                    <div className="absolute inset-0 scale-95 opacity-40 pointer-events-none">
                      <MovieCard movie={nextCard.movie} overlayState={null} />
                    </div>
                  )}
                  <AnimatePresence mode="wait">
                    {current ? (
                      <motion.div
                        key={current.movie.id}
                        className="absolute inset-0 cursor-grab active:cursor-grabbing"
                        style={{ x, rotate, opacity: cardOpacity }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.8}
                        onDrag={handleDrag}
                        onDragEnd={handleDragEnd}
                        initial={{ scale: 0.92, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.88 }}
                        transition={{ duration: 0.3 }}
                      >
                        <MovieCard movie={current.movie} overlayState={overlayState} />
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
                          <p className="text-white font-semibold mb-2">Plus de films pour l'instant</p>
                          <button
                            onClick={loadRecs}
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
                    onLike={() => handleAction('like')}
                    onDislike={() => handleAction('dislike')}
                    onWhyThis={handleWhyThis}
                    disabled={sending || !current}
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
              ${activeTab === 'watchlist' ? 'flex' : 'hidden'} lg:flex
            `}
          >
            <WatchlistHeader />
            <DroppableSection
              id="to_watch"
              title="À voir"
              entries={library.to_watch}
              onDelete={handleDeleteEntry}
              onRate={handleRateEntry}
            />
            <DroppableSection
              id="watched"
              title="Déjà vu"
              entries={library.watched}
              onDelete={handleDeleteEntry}
              onRate={handleRateEntry}
            />
          </div>
        </div>

        {/* ── Bottom navigation — mobile only ────────────────────────────────── */}
        <nav className="lg:hidden flex items-stretch border-t border-white/8 bg-[#0a0a16] shrink-0">
          {[
            { id: 'liked',     icon: Heart,       label: 'Aimés' },
            { id: 'swipe',     icon: Clapperboard, label: 'Découvrir' },
            { id: 'watchlist', icon: List,         label: 'Ma liste' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
                activeTab === id
                  ? 'text-brand-400'
                  : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              <Icon size={22} strokeWidth={activeTab === id ? 2.2 : 1.8} />
              <span className="text-[11px] font-medium tracking-wide">{label}</span>
            </button>
          ))}
        </nav>

        {/* ── Drag overlay ─────────────────────────────────────────────────────── */}
        <DragOverlay dropAnimation={null}>
          {activeDrag ? (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#16162a] border border-brand-500/40 shadow-2xl w-52 opacity-90">
              <div className="w-9 h-12 rounded bg-white/10 shrink-0 overflow-hidden">
                {activeDrag.poster_url && (
                  <img src={activeDrag.poster_url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <p className="text-white text-sm font-medium truncate">{activeDrag.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </div>

      {/* Modals */}
      {whyData && <WhyThisModal data={whyData} onClose={() => setWhyData(null)} />}
      {showFilter && <FilterPanel onClose={() => { setShowFilter(false); loadRecs() }} />}
      {showAddModal && (
        <AddMovieModal onClose={() => setShowAddModal(false)} onAdd={handleAddMovie} />
      )}

      {/* Tour */}
      <AppTour run={runTour || undefined} onFinish={() => setRunTour(false)} />
    </DndContext>
  )
}
