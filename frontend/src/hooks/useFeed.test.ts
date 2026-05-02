import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

// Mock the API client and store BEFORE importing useFeed.
vi.mock("../api/client", () => ({
  getRecommendations: vi.fn(),
  sendInteraction: vi.fn(),
  getWhyThis: vi.fn(),
}));

import { getRecommendations, sendInteraction, getWhyThis } from "../api/client";
import useStore from "../store/useStore";
import { useFeed } from "./useFeed";
import { makeRec, makeMovie } from "../test/factories";

const recs = [
  makeRec({ id: 1, title: "First" }),
  makeRec({ id: 2, title: "Second" }),
  makeRec({ id: 3, title: "Third" }),
];

beforeEach(() => {
  vi.mocked(getRecommendations).mockResolvedValue(recs);
  vi.mocked(sendInteraction).mockResolvedValue(undefined);
  vi.mocked(getWhyThis).mockResolvedValue({
    movie_title: "First",
    reasons: ["because"],
  });
  useStore.setState({ platformFilter: [] });
});

describe("useFeed", () => {
  it("loads recommendations on mount and exposes the first card", async () => {
    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.current?.movie.title).toBe("First");
    expect(result.current.nextCard?.movie.title).toBe("Second");
    expect(getRecommendations).toHaveBeenCalledWith({ platforms: [], limit: 20 });
  });

  it("forwards the active platform filter from the store", async () => {
    useStore.setState({ platformFilter: ["Netflix", "Mubi"] });
    renderHook(() => useFeed());
    await waitFor(() =>
      expect(getRecommendations).toHaveBeenCalledWith({
        platforms: ["Netflix", "Mubi"],
        limit: 20,
      })
    );
  });

  it("sets an error message when loadRecs fails", async () => {
    vi.mocked(getRecommendations).mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/Impossible/);
    expect(result.current.current).toBeUndefined();
  });

  it("handleAction('like') sends an interaction, increments likeCount, and advances", async () => {
    const onLike = vi.fn();
    const { result } = renderHook(() => useFeed({ onLike }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleAction("like");
    });

    expect(sendInteraction).toHaveBeenCalledWith(1, "like");
    expect(result.current.likeCount).toBe(1);
    expect(onLike).toHaveBeenCalledTimes(1);
    expect(result.current.current?.movie.title).toBe("Second");
  });

  it("handleAction('dislike') does not increment likeCount nor call onLike", async () => {
    const onLike = vi.fn();
    const { result } = renderHook(() => useFeed({ onLike }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleAction("dislike");
    });

    expect(sendInteraction).toHaveBeenCalledWith(1, "dislike");
    expect(result.current.likeCount).toBe(0);
    expect(onLike).not.toHaveBeenCalled();
  });

  it("reloads recommendations when the queue is exhausted", async () => {
    vi.mocked(getRecommendations).mockResolvedValueOnce([
      makeRec({ id: 10, title: "Solo" }),
    ]);
    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.current?.movie.title).toBe("Solo");

    // Acting on the only card should trigger a fresh fetch.
    vi.mocked(getRecommendations).mockResolvedValueOnce([
      makeRec({ id: 11, title: "Reloaded" }),
    ]);
    await act(async () => {
      await result.current.handleAction("like");
    });

    await waitFor(() => expect(result.current.current?.movie.title).toBe("Reloaded"));
    expect(getRecommendations).toHaveBeenCalledTimes(2);
  });

  it("ignores handleAction when there is no current card", async () => {
    vi.mocked(getRecommendations).mockResolvedValueOnce([]);
    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleAction("like");
    });
    expect(sendInteraction).not.toHaveBeenCalled();
  });

  it("handleWhyThis fetches and stores the explanation", async () => {
    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleWhyThis();
    });

    expect(getWhyThis).toHaveBeenCalledWith(1);
    expect(result.current.whyData).toEqual({ movie_title: "First", reasons: ["because"] });
  });

  it("handleWhyThis falls back to a generic reason on network failure", async () => {
    vi.mocked(getWhyThis).mockRejectedValueOnce(new Error("net"));
    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleWhyThis();
    });

    expect(result.current.whyData?.reasons[0]).toMatch(/profil/);
  });

  it("closeWhyData clears the modal data", async () => {
    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.handleWhyThis();
    });
    expect(result.current.whyData).not.toBeNull();
    act(() => result.current.closeWhyData());
    expect(result.current.whyData).toBeNull();
  });

  it("handleDrag toggles overlayState based on drag offset", async () => {
    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const fakeEvent = {} as MouseEvent;
    act(() => result.current.handleDrag(fakeEvent, makePan(80)));
    expect(result.current.overlayState).toBe("like");
    act(() => result.current.handleDrag(fakeEvent, makePan(-80)));
    expect(result.current.overlayState).toBe("dislike");
    act(() => result.current.handleDrag(fakeEvent, makePan(0)));
    expect(result.current.overlayState).toBeNull();
  });

  it("handleDragEnd triggers like when dragged past the threshold", async () => {
    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.handleDragEnd({} as MouseEvent, makePan(150));
      // Wait a tick for the action to flush
      await new Promise((r) => setTimeout(r, 400));
    });

    expect(sendInteraction).toHaveBeenCalledWith(1, "like");
  });
});

// Minimal PanInfo factory — only the fields we read.
function makePan(offsetX: number) {
  return {
    delta: { x: 0, y: 0 },
    offset: { x: offsetX, y: 0 },
    point: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
  };
}

// Touch references so unused-imports rule is happy.
void makeMovie;
