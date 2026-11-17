import type { Correction } from "@/contracts/correction";
import type { MistakeCategory } from "@/contracts/mistake-category";
import { Resource, type ResourceLink } from "@/contracts/resource";
import type { WeaknessTrend } from "@/contracts/weakness";
import { catalogEntries } from "./catalog.data";

export const catalog: Resource[] = catalogEntries.map((entry) =>
  Resource.parse(entry),
);

const TYPES = ["grammaire", "input"] as const;

function toLink(entry: Resource): ResourceLink {
  return {
    id: entry.id,
    type: entry.type,
    label: entry.type === "grammaire" ? entry.title : entry.source,
    url: entry.url,
  };
}

export function resourcesFor(
  category: MistakeCategory,
  ids: readonly string[],
): ResourceLink[] {
  const ofCategory = catalog.filter((entry) =>
    entry.categories.includes(category),
  );
  const byId = new Map(ofCategory.map((entry) => [entry.id, entry]));
  const picked = new Map<(typeof TYPES)[number], Resource>();
  for (const id of ids) {
    const entry = byId.get(id);
    if (entry === undefined || picked.has(entry.type)) continue;
    picked.set(entry.type, entry);
  }
  for (const type of TYPES) {
    if (picked.has(type)) continue;
    const fallback = ofCategory.find((entry) => entry.type === type);
    if (fallback) picked.set(type, fallback);
  }
  return TYPES.flatMap((type) => {
    const entry = picked.get(type);
    return entry === undefined ? [] : [toLink(entry)];
  });
}

export function resourceIdsFor(
  kind: Correction["kind"],
  category: MistakeCategory | null,
  ids: readonly string[],
): string[] {
  if (kind !== "mistake" || category === null) return [];
  return resourcesFor(category, ids).map((link) => link.id);
}

export function attachResources(correction: Correction): Correction {
  const convertible =
    correction.kind === "dialect_check" &&
    correction.status === "confirmed_mistake";
  if (
    (correction.kind !== "mistake" && !convertible) ||
    correction.category === null
  ) {
    return { ...correction, resources: [] };
  }
  return {
    ...correction,
    resources: resourcesFor(correction.category, correction.resourceIds),
  };
}

export function resourcesForWeakness(
  category: MistakeCategory,
  trend: WeaknessTrend,
): ResourceLink[] {
  if (trend === "tranquille") return [];
  return resourcesFor(category, []);
}

export function catalogForPrompt(): string {
  return catalog
    .map(
      (entry) =>
        `- ${entry.id} | ${entry.type} | ${entry.title} | ${entry.categories.join(",")}`,
    )
    .join("\n");
}
