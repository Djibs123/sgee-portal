import { useEffect } from 'react'

/** Titre de l'onglet par page (WCAG 2.4.2), lu aussi par les lecteurs d'écran à la navigation. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} – Portail SGEE`
  }, [title])
}
