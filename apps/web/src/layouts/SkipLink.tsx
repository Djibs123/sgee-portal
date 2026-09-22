/** Premier élément focalisable : permet d'ignorer l'en-tête et le menu (WCAG 2.4.1). */
export function SkipLink({ target = 'main-content' }: { target?: string }) {
  return (
    <a className="skip-link" href={`#${target}`}>
      Aller au contenu
    </a>
  )
}
