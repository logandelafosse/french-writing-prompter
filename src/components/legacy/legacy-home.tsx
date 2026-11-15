import Link from "next/link";
import { LevelCard } from "@/components/legacy/level/level-card";
import { PromptCard } from "@/components/legacy/prompt/prompt-card";
import { PlacementTestCard } from "@/components/legacy/placement/placement-test-card";

export function LegacyHome() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            French Writing Prompter
          </h1>
          <Link
            href="/history"
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-700"
          >
            History
          </Link>
        </div>
        <LevelCard />
        <PlacementTestCard />
        <PromptCard />
      </main>
    </div>
  );
}
