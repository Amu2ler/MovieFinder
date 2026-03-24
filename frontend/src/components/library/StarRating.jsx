import React from "react";

export default function StarRating({ value = 0, onChange, readonly = false }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`text-xl leading-none transition-transform ${
            readonly ? "cursor-default" : "hover:scale-125 cursor-pointer"
          } ${star <= value ? "text-yellow-400" : "text-slate-700"}`}
          aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-sm text-slate-400 font-medium tabular-nums">{value}/10</span>
      )}
    </div>
  );
}
