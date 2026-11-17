import { z } from "zod";
import { MistakeCategory } from "./mistake-category";

export const ResourceType = z.enum(["grammaire", "input"]);
export type ResourceType = z.infer<typeof ResourceType>;

export const Resource = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  type: ResourceType,
  title: z.string(),
  url: z.url(),
  source: z.string(),
  categories: z.array(MistakeCategory).min(1),
  dialect: z.enum(["louisiana", "standard"]),
});
export type Resource = z.infer<typeof Resource>;

export const ResourceLink = z.strictObject({
  id: z.string(),
  type: ResourceType,
  label: z.string(),
  url: z.url(),
});
export type ResourceLink = z.infer<typeof ResourceLink>;
