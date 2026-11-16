import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { homeCopy } from "@/copy/fr";
import { OfflineNotice, useOffline } from "./offline-notice";

function OfflineHarness({ onRetry }: { onRetry: () => void }) {
  const offline = useOffline();
  if (!offline) return null;
  return <OfflineNotice onRetry={onRetry} />;
}

describe("offline notice appears on the offline event and clears on retry", () => {
  it("shows the notice after offline and hides it after retry once online", async () => {
    const onRetry = vi.fn(() => {
      window.dispatchEvent(new Event("online"));
    });
    render(<OfflineHarness onRetry={onRetry} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent("Pas de connexion.");
    expect(notice).toHaveTextContent(
      "Ton brouillon est gardé sur cet appareil. Tu peux continuer à écrire.",
    );

    await userEvent.click(
      screen.getByRole("button", { name: homeCopy.offlineRetry }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
