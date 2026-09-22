export const ACCEPTED_FILE_TYPES = '.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg'
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

/** Contrôle côté client (confort) ; l'API revérifie le contenu réel du fichier. */
export function validateFile(file: File | null) {
  if (!file) {
    return 'Sélectionnez un fichier.'
  }

  if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
    return 'Formats acceptés : PDF, PNG ou JPEG.'
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'Le fichier dépasse 5 Mo.'
  }

  return null
}
