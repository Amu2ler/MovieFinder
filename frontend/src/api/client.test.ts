import { describe, it, expect, beforeEach, vi } from "vitest";

// Stub axios.create BEFORE importing the client module so the interceptors
// register against our spy instead of the real axios instance.
const requestUse = vi.fn();
const responseUse = vi.fn();
const fakeApi = {
  defaults: { headers: {} },
  interceptors: {
    request: { use: requestUse },
    response: { use: responseUse },
  },
};

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => fakeApi),
  },
  AxiosError: class AxiosError extends Error {},
}));

const reloadSpy = vi.fn();

beforeEach(() => {
  // Force a fresh `./client` import in every test so interceptor registrations
  // land in this test's `requestUse` / `responseUse` mock.calls.
  vi.resetModules();
  requestUse.mockReset();
  responseUse.mockReset();
  reloadSpy.mockReset();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      ...window.location,
      reload: reloadSpy,
      hostname: "localhost",
      origin: "http://localhost",
    },
  });
});

const loadClient = async () => {
  await import("./client");
  expect(requestUse).toHaveBeenCalledTimes(1);
  expect(responseUse).toHaveBeenCalledTimes(1);
  return {
    onRequest: requestUse.mock.calls[0][0] as (config: { headers: Record<string, string> }) => unknown,
    onResponseError: responseUse.mock.calls[0][1] as (err: unknown) => Promise<unknown>,
  };
};

describe("api client interceptors", () => {
  it("registers exactly one request and one response interceptor", async () => {
    await loadClient();
  });

  it("request interceptor injects Bearer token from the store", async () => {
    const { default: useStore } = await import("../store/useStore");
    useStore.setState({ sessionToken: "tok-abc-123" });

    const { onRequest } = await loadClient();
    const config = { headers: {} as Record<string, string> };
    onRequest(config);
    expect(config.headers.Authorization).toBe("Bearer tok-abc-123");
  });

  it("request interceptor leaves Authorization off when no token", async () => {
    const { default: useStore } = await import("../store/useStore");
    useStore.setState({ sessionToken: null });

    const { onRequest } = await loadClient();
    const config = { headers: {} as Record<string, string> };
    onRequest(config);
    expect(config.headers.Authorization).toBeUndefined();
  });

  it("response interceptor: 401 with active token resets store and reloads", async () => {
    const { default: useStore } = await import("../store/useStore");
    useStore.setState({ sessionToken: "tok-x", userId: 7 });

    const { onResponseError } = await loadClient();
    await expect(onResponseError({ response: { status: 401 } })).rejects.toBeDefined();

    expect(useStore.getState().sessionToken).toBeNull();
    expect(useStore.getState().userId).toBeNull();
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it("response interceptor: 401 with no active token does NOT reload", async () => {
    const { default: useStore } = await import("../store/useStore");
    useStore.setState({ sessionToken: null });

    const { onResponseError } = await loadClient();
    await expect(onResponseError({ response: { status: 401 } })).rejects.toBeDefined();
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("response interceptor: 429 pushes a toast", async () => {
    const { default: useNotifyStore } = await import("../lib/notify");
    useNotifyStore.setState({ toasts: [] });

    const { onResponseError } = await loadClient();
    await expect(onResponseError({ response: { status: 429 } })).rejects.toBeDefined();

    const toasts = useNotifyStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toMatch(/trop de requêtes/i);
  });

  it("response interceptor: 5xx pushes a server-error toast", async () => {
    const { default: useNotifyStore } = await import("../lib/notify");
    useNotifyStore.setState({ toasts: [] });

    const { onResponseError } = await loadClient();
    await expect(onResponseError({ response: { status: 503 } })).rejects.toBeDefined();
    expect(useNotifyStore.getState().toasts[0].message).toMatch(/serveur/i);
  });

  it("response interceptor: network error (no response) toasts a connection failure", async () => {
    const { default: useNotifyStore } = await import("../lib/notify");
    useNotifyStore.setState({ toasts: [] });

    const { onResponseError } = await loadClient();
    await expect(onResponseError({})).rejects.toBeDefined();
    expect(useNotifyStore.getState().toasts[0].message).toMatch(/connexion/i);
  });
});
