import type { SessionDetail } from "@/contracts/session";
import { historyCopy, pastReviewMeta } from "@/copy/history";
import { reviewCopy } from "@/copy/review";
import { Notice } from "@/components/states/notice";
import { CorrectionCard } from "@/components/review/correction-card";
import { MarkedText } from "@/components/review/marked-text";
import { ScoresDisclosure } from "@/components/review/scores-disclosure";
import { PageTitle } from "@/components/ui/page-title";
import { Surface } from "@/components/ui/surface";
import { TextLink } from "@/components/ui/text-link";
import { PromptSheet } from "@/components/writing/prompt-sheet";

export function SessionReviewPage({
  session,
  timeZone,
}: {
  session: SessionDetail;
  timeZone: string;
}) {
  const unreadable = session.dataIssues.includes("evaluation_unreadable");
  const legacy = session.dataIssues.includes("evaluation_legacy");
  const writing = session.writingText ?? "";
  const showMarks = !unreadable && !legacy;

  return (
    <main className="max-w-review mx-auto flex w-full flex-col gap-5 px-5 py-5 pb-20 sm:px-6">
      <TextLink href="/historique" compact>
        {historyCopy.back}
      </TextLink>
      <div className="flex flex-col gap-0.5">
        <PageTitle className="text-[26px] tracking-[-0.02em] max-sm:px-2">
          {session.title}
        </PageTitle>
        <p className="text-muted m-0 text-sm max-sm:px-2">
          {pastReviewMeta(session, timeZone)}
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-7">
        <section
          aria-label={reviewCopy.sheetLabel}
          className="min-w-0 flex-[1_1_520px]"
        >
          <Surface
            padding="review"
            className="flex flex-col gap-4 max-sm:p-[22px_18px_26px]"
          >
            <PromptSheet
              embedded
              mode="review"
              promptText={session.promptText}
              meta={session.promptMeta}
              animateKey={`${session.id}-past`}
            />
            <p className="text-label text-muted m-0 uppercase">
              {reviewCopy.textLabel(session.wordCount)}
            </p>
            {showMarks ? (
              <MarkedText text={writing} corrections={session.corrections} />
            ) : (
              <p
                lang="fr"
                className="text-writing-marked m-0 font-serif whitespace-pre-wrap"
              >
                {writing}
              </p>
            )}
          </Surface>
        </section>
        <section
          aria-label={reviewCopy.mobileListLabel}
          className="flex min-w-0 flex-[1_1_420px] flex-col gap-3"
        >
          {unreadable ? <Notice title={historyCopy.malformedNotice} /> : null}
          {legacy ? (
            <p className="text-muted m-0 text-[15px]">
              {historyCopy.legacyEval}
            </p>
          ) : null}
          {showMarks
            ? session.corrections.map((item) => (
                <CorrectionCard key={item.id} correction={item} readOnly />
              ))
            : null}
          {session.evaluation && !unreadable ? (
            <ScoresDisclosure evaluation={session.evaluation} />
          ) : null}
        </section>
      </div>
    </main>
  );
}
