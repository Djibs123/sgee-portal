const moneyFormatters = new Map<string, Intl.NumberFormat>()

/** Montant dans sa devise réelle (EUR, XOF…), selon les règles françaises. */
export function formatMoney(amount: string | number | null | undefined, currency = 'EUR') {
  if (amount === null || amount === undefined || amount === '') {
    return '—'
  }

  const value = typeof amount === 'number' ? amount : Number(amount)

  if (!Number.isFinite(value)) {
    return '—'
  }

  let formatter = moneyFormatters.get(currency)

  if (!formatter) {
    formatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency })
    moneyFormatters.set(currency, formatter)
  }

  return formatter.format(value)
}

const shortDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeZone: 'UTC' })
const longDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' })
const monthYear = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' })

const toDate = (value: string | Date) => (value instanceof Date ? value : new Date(value))

export const formatDate = (value: string | Date | null | undefined) =>
  value ? shortDate.format(toDate(value)) : '—'

export const formatLongDate = (value: string | Date | null | undefined) =>
  value ? longDate.format(toDate(value)) : '—'

export const formatMonthYear = (value: string | Date | null | undefined) =>
  value ? monthYear.format(toDate(value)) : '—'

export const formatDateTime = (value: string | Date | null | undefined) =>
  value ? dateTime.format(toDate(value)) : '—'

/** Somme exacte de montants décimaux (en centimes) pour éviter les erreurs d'arrondi. */
export function sumAmounts(amounts: Array<string | number>) {
  return amounts.reduce<number>((total, amount) => total + Math.round(Number(amount) * 100), 0) / 100
}
