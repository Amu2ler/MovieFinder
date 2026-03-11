import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'
import StarRating from './StarRating'

const POSTER_PLACEHOLDER = (title) => {
  const initials = title
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300"><rect width="200" height="300" fill="#12121e"/><text x="50%" y="42%" font-family="sans-serif" font-size="48" font-weight="bold" fill="#c49a2e" text-anchor="middle" dominant-baseline="middle">${initials}</text><text x="50%" y="62%" font-family="sans-serif" font-size="11" fill="#6b7280" text-anchor="middle" dominant-baseline="middle">${safeTitle}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

// Draggable tile — left sidebar
export function SidebarMovieCard({ movie }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `sidebar-${movie.id}`,
    data: { movie, source: 'sidebar' },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.25 : 1,
    zIndex: isDragging ? 50 : 'auto',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[#16162a] transition-colors group"
    >
      <img
        src={movie.poster_url || POSTER_PLACEHOLDER(movie.title)}
        alt={movie.title}
        onError={(e) => { e.target.onerror = null; e.target.src = POSTER_PLACEHOLDER(movie.title) }}
        className="w-10 h-16 object-cover rounded-lg shrink-0 shadow-md"
      />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate leading-snug">{movie.title}</p>
        <p className="text-slate-500 text-xs mt-0.5">{movie.year}</p>
      </div>
      <div
        {...listeners}
        {...attributes}
        className="text-slate-700 hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0 touch-none opacity-0 group-hover:opacity-100 transition-opacity"
        title="Glisser vers une liste"
      >
        <GripVertical size={16} />
      </div>
    </div>
  )
}

// Compact tile — right panel columns
export function ColumnMovieCard({ entry, onDelete, onRate }) {
  const title = entry.movie?.title || entry.custom_title || 'Film inconnu'
  const year = entry.movie?.year
  const posterUrl = entry.movie?.poster_url

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `entry-${entry.id}`,
    data: { entry, source: 'column' },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.25 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col gap-2.5 p-3 rounded-xl bg-[#12121e] border border-white/6 hover:bg-[#16162a] transition-colors"
    >
      <div className="flex items-center gap-3">
        <img
          src={posterUrl || POSTER_PLACEHOLDER(title)}
          alt={title}
          onError={(e) => { e.target.onerror = null; e.target.src = POSTER_PLACEHOLDER(title) }}
          className="w-11 h-16 object-cover rounded-lg shrink-0 shadow-md"
        />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate leading-snug">{title}</p>
          {year && <p className="text-slate-500 text-xs mt-0.5">{year}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div
            {...listeners}
            {...attributes}
            className="text-slate-700 hover:text-slate-400 cursor-grab active:cursor-grabbing touch-none p-1 rounded"
            title="Déplacer"
          >
            <GripVertical size={15} />
          </div>
          <button
            onClick={() => onDelete(entry.id)}
            className="text-slate-700 hover:text-red-400 transition-colors p-1 rounded"
            title="Supprimer"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      {entry.list_type === 'watched' && (
        <StarRating value={entry.rating || 0} onChange={(n) => onRate(entry.id, n)} />
      )}
    </div>
  )
}
