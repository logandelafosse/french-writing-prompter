import { appTimeZone } from "@/lib/dates";
import { getEnv } from "./env";

export function quotaTimeZone(): string {
  const configured = getEnv().APP_TIME_ZONE;
  if (configured) {
    return configured;
  }
  return appTimeZone();
}
