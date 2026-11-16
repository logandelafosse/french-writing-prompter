import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";
import { ConfirmSwapDialog } from "./confirm-swap-dialog";

describe("ConfirmSwapDialog", () => {
  it("focuses the safe action and closes on Escape", async () => {
    const user = userEvent.setup();
    const onKeep = vi.fn();

    function Harness() {
      const swapRef = useRef<HTMLButtonElement>(null);
      const [open, setOpen] = useState(true);
      return (
        <>
          <Button ref={swapRef}>↻ Une autre consigne</Button>
          {open ? (
            <ConfirmSwapDialog
              wordCount={40}
              returnFocusRef={swapRef}
              onKeep={() => {
                onKeep();
                setOpen(false);
              }}
              onConfirm={() => setOpen(false)}
            />
          ) : null}
        </>
      );
    }

    render(<Harness />);

    expect(
      screen.getByRole("alertdialog", { name: "Changer de consigne" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ton brouillon de 40 mots va rester dans l'Historique."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Garder celle-là" }),
    ).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(onKeep).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "↻ Une autre consigne" }),
    ).toHaveFocus();
  });
});
