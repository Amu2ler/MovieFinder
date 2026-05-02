import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import StarRating from "./StarRating";
import { posterPlaceholder } from "../../lib/posterPlaceholder";
import type { LibraryEntry, Movie } from "../../api/types";

interface SidebarMovieCardProps {
  movie: Movie;
}

export function SidebarMovieCard({ movie }: SidebarMovieCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `sidebar-${movie.id}`,
    data: { movie, source: "sidebar" },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.25 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[#16162a] transition-colors group"
    >
      <img
        src={movie.poster_url || posterPlaceholder(movie.title)}
        alt={movie.title}
        onError={(e) => {
          const img = e.currentTarget;
          img.onerror = null;
          img.src = posterPlaceholder(movie.title);
        }}
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
  );
}

interface ColumnMovieCardProps {
  entry: LibraryEntry;
  onDelete: (entryId: number) => void;
  onRate: (entryId: number, rating: number) => void;
}

export function ColumnMovieCard({ entry, onDelete, onRate }: ColumnMovieCardProps) {
  const title = entry.movie?.title || entry.custom_title || "Film inconnu";
  const year = entry.movie?.year;
  const posterUrl = entry.movie?.poster_url;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `entry-${entry.id}`,
    data: { entry, source: "column" },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.25 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col gap-2.5 p-3 rounded-xl bg-[#12121e] border border-white/6 hover:bg-[#16162a] transition-colors"
    >
      <div className="flex items-center gap-3">
        <img
          src={posterUrl || posterPlaceholder(title)}
          alt={title}
          onError={(e) => {
            const img = e.currentTarget;
            img.onerror = null;
            img.src = posterPlaceholder(title);
          }}
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
      {entry.list_type === "watched" && (
        <StarRating value={entry.rating || 0} onChange={(n) => onRate(entry.id, n)} />
      )}
    </div>
  );
}
