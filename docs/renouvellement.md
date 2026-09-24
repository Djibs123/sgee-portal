# Renouvellement et candidature : règles et parcours

Ce document décrit le métier couvert par l'API (`apps/api/src/scholarship`) et les écrans
correspondants. Les règles proviennent des conditions publiées par le SGEE ; elles sont
paramétrables par campagne quand c'est possible (dates, âge maximum, pièces demandées).

## Campagnes

Une **campagne** ouvre un type de demande pour une **année universitaire** :

| Type | Objet | Fenêtre habituelle |
|---|---|---|
| `RENEWAL` | renouvellement annuel d'une bourse en cours | 1er septembre → 31 décembre |
| `NEW_APPLICATION` | première demande (candidature) | fixée par l'administration |

- Une seule campagne par type et par année universitaire.
- `opensAt` est inclusif, `closesAt` **exclusif** : l'interface saisit et affiche le
  **dernier jour inclus** (`apps/web/src/lib/campaigns.ts`). Les bornes sont à minuit UTC, qui est
  l'heure de Dakar toute l'année.
- La phase (`UPCOMING`, `OPEN`, `CLOSED`) est **calculée** à la lecture : aucune tâche planifiée.
  Une clôture anticipée renseigne `closedAt`.
- Chaque campagne porte ses **pièces demandées** (`CampaignRequirement`), éventuellement limitées à
  certains cycles (par exemple la lettre du directeur de thèse pour le doctorat).

## Cycle de vie d'une demande

```
            ┌────────── demandeur ──────────┐        ┌──── agent SGEE ────┐
            ▼                               │        ▼                    │
  (création)  DRAFT ──envoi──▶ SUBMITTED ───┴──▶ UNDER_REVIEW ──▶ APPROVED
                │                  │                   │
                │                  │                   ├──▶ REJECTED
                │                  │                   │
                └──retrait──▶ WITHDRAWN ◀──retrait─────┤
                                                       ▼
                                   INCOMPLETE ──renvoi par le demandeur──▶ SUBMITTED
```

- `DRAFT` n'est visible que du demandeur : la file d'instruction ne montre jamais les brouillons.
- Le retrait est possible tant qu'aucune décision n'est prise ; une demande retirée peut être
  reprise tant que la campagne est ouverte (la référence est conservée).
- Les transitions interdites renvoient `409`, avec la liste des transitions possibles côté API
  (`apps/api/src/scholarship/domain/request-status.ts`).
- Chaque changement est historisé (`RequestStatusHistory`) et déclenche une notification.

Références : `REN-AAAA-NNNNNN` pour un renouvellement, `CAN-AAAA-NNNNNN` pour une candidature.

## Éligibilité : blocages et alertes

L'évaluation distingue ce qui **empêche** l'envoi de ce qui **attire l'attention de l'agent**.

**Blocages** (la demande ne peut pas être envoyée)

- bourse annulée ou terminée ;
- campagne fermée ou pas encore ouverte ;
- demande déjà déposée pour cette campagne ;
- plus de 30 ans (paramétrable par campagne) pour une candidature hors doctorat.

**Alertes d'instruction** (envoi possible, décision humaine)

- deuxième redoublement dans le même cycle (un seul redoublement est admis) ;
- redoublement en M2 ou en ING3 (dérogation nécessaire) ;
- doctorat au-delà de la troisième année couverte ;
- changement d'établissement ou de filière ;
- date de fin de bourse dépassée.

Le nombre d'alertes est stocké (`warningCount`) pour filtrer la file d'instruction
(« Avec alertes uniquement »).

## Pièces justificatives

Les pièces attendues dépendent de la campagne et du **niveau demandé** : le formulaire n'affiche la
liste qu'une fois le niveau choisi. Un dépôt est accepté après contrôle du type réel du fichier
(signature binaire PDF/PNG/JPEG, refus des PDF à contenu actif) et de sa taille. Une pièce validée
n'est plus remplaçable ; une pièce refusée doit être redéposée.

Renouvellement : certificat d'inscription de l'année demandée + résultats de l'année précédente
(doctorat : inscription et avis du directeur de thèse). Candidature : pièce d'identité, attestation
d'admission, relevé du baccalauréat, RIB.

## Parcours

**Boursier** — `/portal/renouvellement` : assistant en quatre étapes (année demandée, année
précédente, pièces, vérification et attestation sur l'honneur). Le brouillon est enregistré à chaque
étape avec un verrou de version ; un envoi incomplet renvoie la liste des champs et des pièces
manquants. Après envoi : suivi, frise d'historique, complément demandé, retrait.

**Candidat** — `/candidature` : création de compte, confirmation de l'adresse e-mail, puis le même
assistant (étape « baccalauréat et motivation » à la place de l'année précédente). À l'attribution,
le compte boursier est créé et le candidat est invité à rejoindre l'espace boursier.

**Agent** — `/admin/demandes` : file filtrable (type, statut, campagne, niveau, alertes, recherche),
puis fiche d'instruction (demandeur, cursus, pièces téléchargeables, alertes, historique). Décisions :
prise en charge, demande de complément (motif obligatoire, pièces à redéposer), acceptation
(commentaire facultatif), refus (motif obligatoire).

Effets de l'acceptation, en une seule transaction : mise à jour du dossier (niveau, établissement,
année), création de l'entrée de cursus courante, notification et e-mail, écriture au journal d'audit ;
pour une candidature, création du dossier boursier avec son numéro. Le refus d'un renouvellement met
fin à la bourse.

## Notifications

Chaque étape notifie le demandeur dans son espace (`/portal/notifications`, espace candidat) et par
e-mail lorsque l'adresse est vérifiée : demande envoyée, instruction commencée, complément demandé,
décision.
