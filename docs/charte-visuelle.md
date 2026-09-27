# Charte visuelle — signalétique d'État

Identité du portail SGEE, telle qu'appliquée dans `apps/web/src/index.css`. Trois règles la tiennent ;
une nouvelle page qui les respecte restera cohérente avec le reste sans réglage supplémentaire.

## 1. La couleur ne décore jamais

Elle dit l'état d'un dossier. Toute autre couleur est à éviter.

| Jeton | Valeur | Rôle |
|---|---|---|
| `--ink` | `#14352a` | texte, en-têtes sombres (11,7:1 sur le papier) |
| `--ink-2`, `--ink-3` | `#4a5a50`, `#6a7a71` | texte secondaire, étiquettes |
| `--state` / `--state-deep` | `#0b6b3a` / `#085730` | agir, lien, pièce validée |
| `--state-pale` / `--state-wash` | `#dce8de` / `#f1f6f2` | fonds d'état valide |
| `--paper` | `#edf1ec` | fond de page |
| `--surface` | `#ffffff` | surfaces de contenu |
| `--line` / `--line-soft` | `#c9d6cb` / `#dde6de` | filets |
| `--deadline` / `--deadline-fill` / `--deadline-pale` | `#7a5200` / `#f5c518` / `#fbf0d4` | **échéance seulement** |
| `--refusal` / `--refusal-ink` / `--refusal-pale` | `#b3261e` / `#8c1d18` / `#fbe7e5` | refus, erreur |

L'ambre clair ne passe pas en texte (3,2:1) : il sert d'aplat, `--deadline` sert à l'écrit.
Sur fond sombre ou vert, l'anneau de focus passe au blanc (le vert y tombe à 2:1).
Le tricolore national n'apparaît qu'une fois, en signature de pied de page.

## 2. Une seule famille, la chasse porte la hiérarchie

**Archivo variable** (`wdth` 62–125, `wght` 400–700), servie avec l'axe de chasse. Les titres
s'élargissent comme sur un panneau administratif : `font-stretch` 118 % pour le titre d'accueil,
114 % pour un titre de page, 108 % pour une section, 100 % pour le texte courant.

- Échelle : 0,75 / 0,8125 / 0,875 / 0,9375 (base) / 1 / 1,1875 / 1,5 / 1,625 rem, puis `clamp` pour le hero.
- Chiffres, montants et références en chasse tabulaire (`font-variant-numeric`), jamais en police à chasse fixe.
- Pas de capitales pour les étiquettes, pas de mot isolé en couleur dans un titre, pas de « → » dans un bouton.
- Mesure de lecture : `--measure` (66 caractères), appliquée aux paragraphes.

## 3. Surfaces plates, l'ombre est réservée à ce qui flotte

Rayons presque droits (`--r-surface` 3px, `--r-control` 4px, `--r-stamp` 2px), filets plutôt qu'ombres,
une seule ombre (`--shadow-float`) pour les dialogues et le tiroir mobile. Les statuts sont des
pastilles-tampon à bord marqué ; l'onglet ou l'élément actif se signale par un bord plein (3px),
jamais par une pilule arrondie.

## L'échéance, objet principal

`components/CampaignBand.tsx` rend la campagne comme une bande : premier jour, dernier jour inclus,
repère du jour, temps restant. Elle apparaît **une seule fois par écran** — accueil public, tableau de
bord boursier, espace de demande — et c'est le seul endroit qui parle de délai. Le graphique est
`aria-hidden` : la période et le temps restant sont aussi écrits en texte.

## Écriture

Nommer ce que l'utilisateur comprend, à la voix active, en casse de phrase. Un bouton dit ce qui va se
passer (« Enregistrer et continuer », « Demander le complément ») et garde le même mot jusqu'au message
de confirmation. Une erreur explique quoi faire ; un écran vide invite à agir.
