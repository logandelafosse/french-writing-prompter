const ISSUE_LINE = /^GitHub issue:\s*#(\d+)\s*$/m;

export function parseGithubIssueNumber(ticketText: string): number {
  const match = ISSUE_LINE.exec(ticketText);
  if (!match) {
    throw new Error(
      "Ticket file must include a line: GitHub issue: #<n> (see docs/plan/tickets/_TEMPLATE.md)",
    );
  }
  return Number(match[1]);
}

export function titleMatchesTicket(title: string, ticketId: string): boolean {
  if (title.includes(ticketId)) return true;
  const parent = /^(T\d+|D\d+)/.exec(ticketId)?.[1];
  return parent !== undefined && parent !== ticketId && title.includes(parent);
}

export function assertIssueMatchesTicket(
  meta: { number: number; title: string; isPullRequest: boolean },
  ticketId: string,
): void {
  if (meta.isPullRequest) {
    throw new Error(
      `#${meta.number} is a pull request, not an issue — refuse to overwrite`,
    );
  }
  if (!titleMatchesTicket(meta.title, ticketId)) {
    throw new Error(
      `#${meta.number} title ${JSON.stringify(meta.title)} does not contain ${ticketId}`,
    );
  }
}
