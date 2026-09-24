# Front SGEE

Application monopage React 19 + Vite 8 + React Router 8. Trois espaces cohabitent : site public,
espace boursier, espace candidat et back-office, chacun avec sa propre session.

## Organisation

| Dossier | Rôle |
|---|---|
| `router.tsx` | toutes les routes ; le back-office est chargé à la demande |
| `session/` | contexte de session par espace (`useStudentSession`, `useApplicantSession`, `useAdminSession`) |
| `layouts/` | mises en page protégées, gabarit des pages d'accès, lien d'évitement |
| `lib/api/` | client HTTP par domaine (en-tête CSRF, redirection sur session expirée) |
| `lib/` | formatage, libellés métier, dates de campagne, chargement de ressources |
| `components/ui/` | briques accessibles (dialogue natif, messages annoncés, pastilles, étapes, pagination, champs) |
| `components/requests/` | assistant de demande partagé par le boursier et le candidat |
| `components/admin/`, `pages/admin/` | back-office |

## Conventions

- **Accessibilité (WCAG 2.2 AA)** : un seul `h1` par page, focus visible, focus déplacé sur le titre
  d'étape et sur le premier champ invalide, messages dans des régions `aria-live`, dialogues `<dialog>`
  natifs, données en lecture seule en listes de définitions, noms accessibles commençant par le texte
  visible, cibles d'au moins 24 px, `prefers-reduced-motion` respecté.
- **État dans l'URL** : filtres, pagination et demande consultée sont des paramètres d'URL (liens
  partageables, bouton Précédent).
- **Pas de `window.alert`, `confirm` ni `prompt`** : `ConfirmDialog` et `ReasonDialog`.
- Les libellés métier viennent de l'API quand elle les fournit (`statusLabel`, `phaseLabel`).

## Commandes

```bash
pnpm --filter web dev        # serveur de développement (5173)
pnpm --filter web test       # Vitest + Testing Library
pnpm --filter web lint       # ESLint, dont les règles jsx-a11y
pnpm --filter web typecheck
pnpm --filter web build
```

`VITE_API_BASE_URL` pointe vers l'API (`http://localhost:3000/api` par défaut, `/api` derrière
nginx). En développement, l'API doit autoriser l'origine du front (`FRONTEND_ORIGIN`).
