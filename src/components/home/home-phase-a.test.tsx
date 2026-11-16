import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomePhaseA } from "./home-phase-a";
import { homeCopy } from "@/copy/fr";

describe("HomePhaseA generate", () => {
  it("disables generate when quota is exhausted on A-ready", () => {
    render(
      <HomePhaseA
        variant="ready"
        selectedLevel="B1"
        onLevelChange={vi.fn()}
        onGenerate={vi.fn()}
        generating={false}
        quotaRemaining={0}
      />,
    );
    expect(
      screen.getByRole("button", { name: homeCopy.generate }),
    ).toBeDisabled();
  });
});
