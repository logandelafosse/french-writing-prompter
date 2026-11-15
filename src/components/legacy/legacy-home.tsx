import { LevelCard } from "@/components/legacy/level/level-card";
import { PromptCard } from "@/components/legacy/prompt/prompt-card";
import { PlacementTestCard } from "@/components/legacy/placement/placement-test-card";

export function LegacyHome() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
        <LevelCard />
        <PlacementTestCard />
        <PromptCard />
      </main>
    </div>
  );
}
