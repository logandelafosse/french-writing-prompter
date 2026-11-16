import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { homeCopy } from "@/copy/fr";
import { ErrorAlert } from "./error-alert";

describe("error alert keeps the text and retries the same submission", () => {
  it("shows the evaluate copy and retries on Essayer encore", async () => {
    const onRetry = vi.fn();
    render(
      <ErrorAlert
        lead={homeCopy.errorEvaluateLead}
        body={homeCopy.errorEvaluateBody}
        onRetry={onRetry}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("J'ai pas pu lire ton texte ce coup-ci.");
    expect(alert).toHaveTextContent("Il est toujours là, y a rien de perdu.");
    await userEvent.click(
      screen.getByRole("button", { name: homeCopy.errorRetry }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
