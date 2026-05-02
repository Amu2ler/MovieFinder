import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act, waitForElementToBeRemoved } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Toaster from "./Toaster";
import useNotifyStore, { notify } from "../lib/notify";

describe("<Toaster />", () => {
  beforeEach(() => {
    useNotifyStore.setState({ toasts: [] });
  });

  it("renders nothing when there are no toasts", () => {
    render(<Toaster />);
    expect(screen.queryByRole("button", { name: /fermer/i })).toBeNull();
  });

  it("renders a toast when one is pushed", async () => {
    render(<Toaster />);
    act(() => {
      notify("Erreur réseau", "error");
    });
    expect(await screen.findByText("Erreur réseau")).toBeInTheDocument();
  });

  it("dismisses a toast when the close button is clicked", async () => {
    const user = userEvent.setup();
    render(<Toaster />);
    act(() => {
      notify("À supprimer", "success", 60_000);
    });
    expect(await screen.findByText("À supprimer")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /fermer/i }));
    // AnimatePresence runs an exit animation, so wait for the node to leave the DOM
    await waitForElementToBeRemoved(() => screen.queryByText("À supprimer"));
  });

  it("renders multiple toasts in order", async () => {
    render(<Toaster />);
    act(() => {
      notify("first");
      notify("second");
      notify("third");
    });
    expect(await screen.findByText("first")).toBeInTheDocument();
    expect(screen.getByText("second")).toBeInTheDocument();
    expect(screen.getByText("third")).toBeInTheDocument();
  });
});
