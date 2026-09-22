/** Miroir de la politique de l'API (NIST SP 800-63B) : longueur seule, pas de règles de composition. */
export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

export const PASSWORD_HINT = `Au moins ${PASSWORD_MIN_LENGTH} caractères. Une phrase facile à retenir convient très bien.`

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Le mot de passe doit contenir au plus ${PASSWORD_MAX_LENGTH} caractères.`
  }

  return null
}
