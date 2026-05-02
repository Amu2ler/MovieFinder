import { describe, it, expect, beforeEach, vi } from "vitest";
import useNotifyStore, { notify, notifyError, notifySuccess } from "./notify";

describe("notify store", () => {
  beforeEach(() => {
    useNotifyStore.setState({ toasts: [] });
    vi.useFakeTimers();
  });

  it("pushes a toast with the given message and type", () => {
    notify("hello", "success");
    const { toasts } = useNotifyStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ message: "hello", type: "success" });
  });

  it("notifyError defaults to error type", () => {
    notifyError("boom");
    expect(useNotifyStore.getState().toasts[0].type).toBe("error");
  });

  it("notifySuccess uses success type", () => {
    notifySuccess("ok");
    expect(useNotifyStore.getState().toasts[0].type).toBe("success");
  });

  it("auto-removes the toast after the duration elapses", () => {
    notify("temp", "error", 1000);
    expect(useNotifyStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(999);
    expect(useNotifyStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(2);
    expect(useNotifyStore.getState().toasts).toHaveLength(0);
  });

  it("remove(id) immediately drops the matching toast", () => {
    notify("a");
    notify("b");
    const { remove, toasts } = useNotifyStore.getState();
    remove(toasts[0].id);
    const after = useNotifyStore.getState().toasts;
    expect(after).toHaveLength(1);
    expect(after[0].message).toBe("b");
  });

  it("each toast gets a unique id", () => {
    notify("a");
    notify("b");
    notify("c");
    const ids = useNotifyStore.getState().toasts.map((t) => t.id);
    expect(new Set(ids).size).toBe(3);
  });
});
