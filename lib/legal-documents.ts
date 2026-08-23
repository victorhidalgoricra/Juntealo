export const LEGAL_DOCUMENTS = {
  terms: {
    version: '1.0',
    updatedAtLabel: '23 de agosto de 2026'
  },
  privacy: {
    version: '1.0',
    updatedAtLabel: '23 de agosto de 2026'
  }
} as const;

// TODO(product): definir cómo detectar una nueva versión y solicitar nuevamente
// el consentimiento a usuarios existentes antes de implementar el reconsentimiento.
