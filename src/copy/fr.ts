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
  evalError: "Une erreur s'est produite pendant l'évaluation.",
  retry: "Réessayer",
  wordNudge:
    "Encore une cinquantaine de mots, si le cœur t'en dit. Tu peux envoyer n'importe quand.",
  reviewNextPrompt: (remaining: number) =>
    `Une autre consigne · reste ${remaining}`,
} as const;
