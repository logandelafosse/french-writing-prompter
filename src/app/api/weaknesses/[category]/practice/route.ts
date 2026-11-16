import { NextResponse } from "next/server";
import { PracticePinResponse } from "@/contracts/api";
import { MistakeCategory } from "@/contracts/mistake-category";
import {
  pinPractice,
  unpinPractice,
} from "@/modules/weakness-service/practice-store";
import { withErrors } from "@/server/with-errors";

function unknownCategory() {
  return NextResponse.json(
    { error: { code: "VALIDATION", message: "Catégorie inconnue." } },
    { status: 422 },
  );
}

async function parseCategory(params: Promise<{ category: string }>) {
  const parsed = MistakeCategory.safeParse((await params).category);
  return parsed.success ? parsed.data : null;
}

export const POST = withErrors(async function postPractice(
  _request: Request,
  context: { params: Promise<{ category: string }> },
) {
  const category = await parseCategory(context.params);
  if (category === null) return unknownCategory();
  await pinPractice(category, () => new Date());
  return NextResponse.json(PracticePinResponse.parse({ pinned: true }));
});

export const DELETE = withErrors(async function deletePractice(
  _request: Request,
  context: { params: Promise<{ category: string }> },
) {
  const category = await parseCategory(context.params);
  if (category === null) return unknownCategory();
  await unpinPractice(category, () => new Date());
  return NextResponse.json(PracticePinResponse.parse({ pinned: false }));
});
