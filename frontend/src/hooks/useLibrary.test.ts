import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

vi.mock("../api/client", () => ({
  getLibrary: vi.fn(),
  addLibraryEntry: vi.fn(),
  updateLibraryEntry: vi.fn(),
  deleteLibraryEntry: vi.fn(),
}));

import {
  getLibrary,
  addLibraryEntry,
  updateLibraryEntry,
  deleteLibraryEntry,
} from "../api/client";
import { useLibrary } from "./useLibrary";
import { makeEntry, makeMovie } from "../test/factories";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";

const initialLibrary = {
  liked: [makeMovie({ id: 1, title: "Liked One" })],
  to_watch: [makeEntry({ id: 10, movie_id: 5, movie: makeMovie({ id: 5 }) })],
  watched: [
    makeEntry({
      id: 20,
      movie_id: 6,
      list_type: "watched",
      rating: 7,
      movie: makeMovie({ id: 6 }),
    }),
  ],
};

beforeEach(() => {
  vi.mocked(getLibrary).mockResolvedValue(initialLibrary);
});

describe("useLibrary — load & basic state", () => {
  it("loads the library on mount", async () => {
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.library.liked).toHaveLength(1));
    expect(result.current.library.to_watch).toHaveLength(1);
    expect(result.current.library.watched).toHaveLength(1);
    expect(getLibrary).toHaveBeenCalledTimes(1);
  });
});

describe("useLibrary — CRUD", () => {
  it("addEntry appends to the correct list", async () => {
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.library.liked).toHaveLength(1));

    const newEntry = makeEntry({ id: 99, movie_id: 99, list_type: "to_watch" });
    vi.mocked(addLibraryEntry).mockResolvedValueOnce(newEntry);

    await act(async () => {
      await result.current.addEntry({ movie_id: 99, list_type: "to_watch" });
    });

    expect(result.current.library.to_watch).toHaveLength(2);
    expect(result.current.library.to_watch.some((e) => e.id === 99)).toBe(true);
  });

  it("deleteEntry removes from both columns", async () => {
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.library.to_watch).toHaveLength(1));

    vi.mocked(deleteLibraryEntry).mockResolvedValueOnce();

    await act(async () => {
      await result.current.deleteEntry(10);
    });

    expect(result.current.library.to_watch).toHaveLength(0);
    expect(deleteLibraryEntry).toHaveBeenCalledWith(10);
  });

  it("rateEntry updates the matching watched entry only", async () => {
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.library.watched).toHaveLength(1));

    const updated = makeEntry({
      id: 20,
      movie_id: 6,
      list_type: "watched",
      rating: 10,
    });
    vi.mocked(updateLibraryEntry).mockResolvedValueOnce(updated);

    await act(async () => {
      await result.current.rateEntry(20, 10);
    });

    expect(result.current.library.watched[0].rating).toBe(10);
    expect(updateLibraryEntry).toHaveBeenCalledWith(20, { rating: 10 });
  });
});

describe("useLibrary — DnD", () => {
  it("dragging a sidebar movie into a column adds a new entry", async () => {
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.library.liked).toHaveLength(1));

    const newEntry = makeEntry({ id: 30, movie_id: 1, list_type: "to_watch" });
    vi.mocked(addLibraryEntry).mockResolvedValueOnce(newEntry);

    await act(async () => {
      await result.current.handleDndEnd({
        active: { id: "sidebar-1", data: { current: { source: "sidebar", movie: makeMovie({ id: 1 }) } } },
        over: { id: "to_watch" },
      } as unknown as DragEndEvent);
    });

    expect(addLibraryEntry).toHaveBeenCalledWith({ movie_id: 1, list_type: "to_watch" });
    expect(result.current.library.to_watch.some((e) => e.id === 30)).toBe(true);
  });

  it("dragging a sidebar movie that already exists moves it instead of adding", async () => {
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.library.to_watch).toHaveLength(1));

    const moved = makeEntry({ id: 10, movie_id: 5, list_type: "watched" });
    vi.mocked(updateLibraryEntry).mockResolvedValueOnce(moved);

    await act(async () => {
      await result.current.handleDndEnd({
        active: { id: "sidebar-5", data: { current: { source: "sidebar", movie: makeMovie({ id: 5 }) } } },
        over: { id: "watched" },
      } as unknown as DragEndEvent);
    });

    expect(updateLibraryEntry).toHaveBeenCalledWith(10, { list_type: "watched" });
    expect(addLibraryEntry).not.toHaveBeenCalled();
    expect(result.current.library.to_watch).toHaveLength(0);
    expect(result.current.library.watched.some((e) => e.id === 10)).toBe(true);
  });

  it("dropping on the same column it already lives in is a no-op", async () => {
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.library.to_watch).toHaveLength(1));

    await act(async () => {
      await result.current.handleDndEnd({
        active: {
          id: "entry-10",
          data: {
            current: {
              source: "column",
              entry: makeEntry({ id: 10, movie_id: 5, list_type: "to_watch" }),
            },
          },
        },
        over: { id: "to_watch" },
      } as unknown as DragEndEvent);
    });

    expect(updateLibraryEntry).not.toHaveBeenCalled();
  });

  it("dragging a column entry into the other column moves it", async () => {
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.library.to_watch).toHaveLength(1));

    const moved = makeEntry({ id: 10, movie_id: 5, list_type: "watched" });
    vi.mocked(updateLibraryEntry).mockResolvedValueOnce(moved);

    await act(async () => {
      await result.current.handleDndEnd({
        active: {
          id: "entry-10",
          data: {
            current: {
              source: "column",
              entry: makeEntry({ id: 10, movie_id: 5, list_type: "to_watch" }),
            },
          },
        },
        over: { id: "watched" },
      } as unknown as DragEndEvent);
    });

    expect(updateLibraryEntry).toHaveBeenCalledWith(10, { list_type: "watched" });
    expect(result.current.library.to_watch).toHaveLength(0);
    expect(result.current.library.watched.some((e) => e.id === 10)).toBe(true);
  });

  it("handleDndStart sets activeDrag to the dragged movie", async () => {
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.library.liked).toHaveLength(1));

    const movie = makeMovie({ id: 99, title: "Active" });
    act(() => {
      result.current.handleDndStart({
        active: { id: "sidebar-99", data: { current: { source: "sidebar", movie } } },
      } as unknown as DragStartEvent);
    });

    expect(result.current.activeDrag?.id).toBe(99);
  });

  it("dropping outside any column clears activeDrag and does nothing", async () => {
    const { result } = renderHook(() => useLibrary());
    await waitFor(() => expect(result.current.library.liked).toHaveLength(1));

    await act(async () => {
      await result.current.handleDndEnd({
        active: { id: "sidebar-1", data: { current: { source: "sidebar", movie: makeMovie() } } },
        over: null,
      } as unknown as DragEndEvent);
    });

    expect(addLibraryEntry).not.toHaveBeenCalled();
    expect(updateLibraryEntry).not.toHaveBeenCalled();
    expect(result.current.activeDrag).toBeNull();
  });
});
