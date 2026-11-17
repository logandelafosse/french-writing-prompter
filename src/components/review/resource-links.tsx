import type { ResourceLink } from "@/contracts/resource";
import { reviewCopy } from "@/copy/review";
import { TextLink } from "@/components/ui/text-link";
import { cn } from "@/lib/utils";

export function ResourceLinks({
  resources,
  layout,
}: {
  resources: ResourceLink[];
  layout: "row" | "column";
}) {
  if (resources.length === 0) return null;
  return (
    <p
      lang="fr"
      className={cn(
        "m-0 flex text-sm",
        layout === "column"
          ? "flex-col sm:flex-row sm:flex-wrap sm:gap-x-4"
          : "flex-row flex-wrap gap-x-[18px]",
      )}
    >
      {resources.map((resource) => (
        <TextLink
          key={resource.id}
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-touch text-[14px] sm:min-h-8"
        >
          {resource.type === "grammaire"
            ? reviewCopy.resourceGrammar(resource.label)
            : reviewCopy.resourceInput(resource.label)}
          <span className="sr-only"> {reviewCopy.newTab}</span>
        </TextLink>
      ))}
    </p>
  );
}
