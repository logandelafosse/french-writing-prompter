import Link from "next/link";
import { LevelCard } from "@/components/level/level-card";
import { PromptCard } from "@/components/prompt/prompt-card";
import { PlacementTestCard } from "@/components/placement/placement-test-card";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-zinc-50">
      <main className="w-full max-w-2xl mx-auto flex flex-col gap-6 p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            French Writing Prompter
          </h1>
          <Link
            href="/history"
            className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
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
