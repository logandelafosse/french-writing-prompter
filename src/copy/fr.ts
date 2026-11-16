/** Home / Phase A — HANDOFF §5 */
export const homeCopy = {
  welcomeLead:
    "Bienvenue. Icitte, on écrit un petit texte par jour, en français de la Louisiane.",
  welcomeBody:
    "Pour te donner une consigne à ta mesure, il me faut ton niveau. Tu pourras le changer n'importe quand.",
  levelLegend: "Ton niveau CECR",
  generate: "Donne-moi une consigne",
  generateBusy: "Je cherche une consigne…",
  promptLabel: "Consigne d'écriture",
  promptLabelWithIndex: "Consigne d'écriture · 3 sur 3",
  swapPrompt: "↻ Une autre consigne",
  swapPromptDisabled: "↻ Une autre consigne · à minuit",
  quotaNoticeTitle: "T'as pris tes trois consignes pour aujourd'hui.",
  quotaNoticeCountdown: (countdown: string) =>
    `La prochaine arrive à minuit, dans ${countdown}.`,
  quotaNoticeDraft:
    "Ton brouillon reste icitte : tu peux le finir et l'envoyer quand tu veux.",
  swapDialogLabel: "Changer de consigne",
  swapDialogLead: "Changer de consigne ?",
  swapDialogBody: (wordCount: number) =>
    `Ton brouillon de ${wordCount} mots va rester dans l'Historique.`,
  swapKeep: "Garder celle-là",
  swapConfirm: "Changer",
  placementLink: "Pas sûr ? Fais le test de placement (3 consignes)",
  aReadyLead: "Prêt pour ta consigne du jour ?",
  writingLabel: "Ton texte",
  draftSaved: (time: string) => `Brouillon sauvé à ${time}`,
  submit: "Corrige-moi",
  submitBusy: "Je lis ton texte…",
  loadError: "Une erreur s'est produite. Réessaie.",
  retry: "Réessayer",
  errorEvaluateLead: "J'ai pas pu lire ton texte ce coup-ci.",
  errorEvaluateBody: "Il est toujours là, y a rien de perdu.",
  errorGenerateLead: "J'ai pas pu trouver de consigne ce coup-ci.",
  errorRetry: "Essayer encore",
  offlineLead: "Pas de connexion.",
  offlineBody:
    "Ton brouillon est gardé sur cet appareil. Tu peux continuer à écrire.",
  offlineRetry: "Réessayer",
  draftLocal: "Brouillon gardé sur cet appareil",
  wordNudge:
    "Encore une cinquantaine de mots, si le cœur t'en dit. Tu peux envoyer n'importe quand.",
  reviewNextPrompt: (remaining: number) =>
    `Une autre consigne · reste ${remaining}`,
  reviewNextPromptDisabled: "Une autre consigne · à minuit",
  advanceLead: (to: string) => `Te voilà en ${to}.`,
  advanceBody: (from: string) =>
    `Tes dernières évaluations étaient au-dessus de ${from}, ça fait que les consignes vont monter d'un cran.`,
  advanceUndo: (from: string) => `Rester en ${from}`,
  focusLabel: "Focus du jour",
  focusReasonAuto:
    "C'est ce qui est revenu le plus dans tes dernières évaluations. La consigne va t'y faire travailler.",
  focusChange: "Changer de focus dans le Carnet",
} as const;
