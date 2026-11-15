import type { QuotaState } from "@/modules/quota-manager/quota-db-store";

export type QuotaTextProps = {
  quota: QuotaState;
  firstRun: boolean;
  compact?: boolean | undefined;
};

export function quotaMessage(
  quota: QuotaState,
  firstRun: boolean,
  compact?: boolean,
): string {
  if (firstRun) {
    return "3 consignes aujourd'hui";
  }
  if (quota.remaining === 0) {
    return compact ? "3 sur 3 prises" : "3 consignes sur 3 prises";
  }
  if (compact) {
    return `Reste ${quota.remaining} sur 3`;
  }
  if (quota.remaining === 1) {
    return "Reste 1 consigne sur 3";
  }
  return `Reste ${quota.remaining} consignes sur 3`;
}

export function QuotaText({ quota, firstRun, compact }: QuotaTextProps) {
  return (
    <span className="text-muted text-[15px] sm:text-[14px]">
      {quotaMessage(quota, firstRun, compact)}
    </span>
  );
}
