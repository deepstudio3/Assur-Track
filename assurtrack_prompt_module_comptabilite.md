# AssurTrack — Prompt Complémentaire : Module Comptabilité Ventes & Dettes Clients
> Complément au fichier `assurtrack_prompt_senior_dev.md`  
> Ce module s'ajoute à l'existant sans rien modifier. Même stack, même design system.

---

## CONTEXTE DU MODULE

L'entreprise cliente vend des **boissons (jus, eau)** et propose des **photocopies**. Les secrétaires enregistrent chaque vente dans l'application. Certains clients repartent sans payer immédiatement — on appelle ça une **vente à crédit**. La secrétaire peut consulter à tout moment la liste des clients qui lui doivent de l'argent.

**Règle critique identique au module Caisse :** chaque opération enregistrée déclenche immédiatement un message WhatsApp vers la patronne. Les ventes sont immuables — jamais de suppression.

---

## NOUVELLES TABLES BASE DE DONNÉES

```sql
-- Catalogue des produits (configurable par la patronne)
CREATE TABLE produits (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id),
  nom           VARCHAR(100) NOT NULL,   -- ex: "Jus orange", "Eau minérale 1.5L"
  prix_unitaire DECIMAL(10,2) NOT NULL,
  categorie     VARCHAR(50) DEFAULT 'boisson', -- 'boisson' uniquement pour l'instant
  actif         BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Ventes enregistrées par les secrétaires
CREATE TABLE ventes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id   UUID REFERENCES entreprises(id),
  secretaire_id   UUID REFERENCES users(id),
  montant_total   DECIMAL(10,2) NOT NULL,
  mode_paiement   VARCHAR(20) NOT NULL CHECK (mode_paiement IN ('comptant', 'credit')),
  statut          VARCHAR(20) DEFAULT 'payee' CHECK (statut IN ('payee', 'en_attente')),
  -- Si crédit : identité du client (nom libre, pas de fiche obligatoire)
  client_nom      VARCHAR(100),   -- rempli si mode_paiement = 'credit'
  client_prenom   VARCHAR(100),
  note            TEXT,
  -- Immuable : pas de DELETE, pas d'UPDATE sur montant_total
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Lignes de chaque vente (détail des produits)
CREATE TABLE ventes_lignes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vente_id    UUID REFERENCES ventes(id),
  produit_id  UUID REFERENCES produits(id),
  quantite    INTEGER NOT NULL,
  prix_unitaire DECIMAL(10,2) NOT NULL,  -- prix au moment de la vente (snapshot)
  sous_total  DECIMAL(10,2) NOT NULL
);

-- Paiements des dettes (une dette peut être payée en plusieurs fois)
CREATE TABLE paiements_dette (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vente_id    UUID REFERENCES ventes(id),
  montant     DECIMAL(10,2) NOT NULL,
  paye_par    UUID REFERENCES users(id),  -- secrétaire OU patronne
  note        TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_ventes_secretaire ON ventes(secretaire_id);
CREATE INDEX idx_ventes_statut ON ventes(statut);
CREATE INDEX idx_ventes_created ON ventes(created_at);
```

---

## NOUVELLES ROUTES API

```
GET    /api/ventes                        → Liste paginée (filtre: statut, date, secretaire)
POST   /api/ventes                        → Enregistrer une vente (comptant ou crédit)
GET    /api/ventes/:id                    → Détail d'une vente + lignes produits
GET    /api/ventes/dettes                 → Liste des ventes à crédit non soldées
POST   /api/ventes/:id/payer             → Enregistrer un paiement de dette

GET    /api/produits                      → Liste des produits actifs
POST   /api/produits                      → Ajouter un produit (patronne only)
PATCH  /api/produits/:id                  → Modifier prix ou statut

GET    /api/dashboard/stats-ventes        → CA du jour, semaine, mois + total dettes
```

---

## NOUVELLES PAGES FRONTEND

### Structure à ajouter dans `src/pages/`

```
pages/
├── ventes/
│   ├── VentesList.jsx          # Historique de toutes les ventes
│   ├── NouvelleVente.jsx       # Formulaire caisse — enregistrer une vente
│   └── Dettes.jsx              # Liste des clients débiteurs
└── produits/
    └── ProduitsConfig.jsx      # Gérer le catalogue (patronne only)
```

### Navigation Sidebar — items à ajouter

```jsx
{ icon: ShoppingCart, label: "Caisse ventes",   path: "/ventes" },
{ icon: AlertCircle,  label: "Dettes clients",   path: "/ventes/dettes" },
{ icon: Package,      label: "Produits",          path: "/produits", roles: ["patronne"] },
```

---

## PAGE 1 : Nouvelle Vente (`/ventes/nouvelle`)

Interface pensée pour une utilisation rapide au comptoir — la secrétaire doit pouvoir enregistrer une vente en moins de 30 secondes.

### Layout
```
┌─────────────────────────────────────────────────┐
│  CAISSE — Nouvelle vente         [Annuler]        │
├──────────────────┬──────────────────────────────┤
│  PRODUITS        │  PANIER                       │
│                  │                               │
│  [Jus orange]    │  Jus orange x2    1 400 FCFA  │
│  700 FCFA        │  Eau 1.5L   x1      500 FCFA  │
│                  │  ─────────────────────────    │
│  [Eau 1.5L ]     │  TOTAL          1 900 FCFA    │
│  500 FCFA        │                               │
│                  │  ○ Paiement comptant           │
│  [Eau 0.5L ]     │  ● Paiement à crédit           │
│  300 FCFA        │    Nom    [          ]         │
│                  │    Prénom [          ]         │
│                  │                               │
│                  │  [Valider la vente]            │
└──────────────────┴──────────────────────────────┘
```

### Comportement
- Clic sur un produit → l'ajoute au panier avec +1 quantité
- Clic à nouveau → incrémente la quantité
- Bouton − dans le panier pour réduire
- Mode "crédit" affiche les champs Nom + Prénom (obligatoires)
- Bouton "Valider" → confirmation → envoi WhatsApp patronne → retour liste
- **Après validation** : toast "Vente enregistrée — La patronne a été notifiée" + réinitialisation du panier

---

## PAGE 2 : Liste des ventes (`/ventes`)

- Filtres pills : Aujourd'hui / Cette semaine / Ce mois / Toutes
- Filtre secondaire : Comptant / À crédit / Toutes
- Table :
  - Colonnes : Date & heure / Secrétaire / Produits (résumé) / Total / Mode / Statut
  - Badge statut : "Payée" (vert) / "En attente" (orange)
  - Clic sur une ligne → modal détail avec liste des produits

- StatCards en haut :
  - CA du jour
  - CA du mois
  - Total dettes en cours
  - Nombre de ventes aujourd'hui

---

## PAGE 3 : Dettes clients (`/ventes/dettes`)

C'est la page clé pour éviter les litiges.

### Layout principal
```
┌─────────────────────────────────────────────────────┐
│  DETTES CLIENTS              3 clients · 87 500 FCFA │
├─────────────────────────────────────────────────────┤
│  Mballa Jean        2 dettes    45 000 FCFA  [Voir]  │
│  Nguema Pierre      1 dette     22 500 FCFA  [Voir]  │
│  Fotso Awa          3 dettes    20 000 FCFA  [Voir]  │
└─────────────────────────────────────────────────────┘
```

### Modal détail par client (clic sur [Voir])
```
┌──────────────────────────────────────────────────┐
│  Dettes de Mballa Jean                      [X]  │
│  Total dû : 45 000 FCFA                          │
├──────────────────────────────────────────────────┤
│  24 juin · 10:14   Jus x3 + Eau x2   3 500 FCFA │
│                                  [Marquer payé]  │
├──────────────────────────────────────────────────┤
│  23 juin · 16:30   Jus x10          7 000 FCFA  │
│                                  [Marquer payé]  │
└──────────────────────────────────────────────────┘
```

### Règles
- Grouper les dettes par client (nom + prénom)
- Chaque ligne = une vente à crédit avec date, heure, détail produits, montant
- Bouton "Marquer payé" visible pour **la secrétaire ET la patronne**
- Confirmation avant validation : "Confirmer le paiement de 3 500 FCFA par Mballa Jean ?"
- Une fois payé : la ligne disparaît de la liste des dettes, reste dans l'historique des ventes avec statut "Payée"
- Si toutes les dettes d'un client sont soldées → le client disparaît de la liste

---

## TEMPLATES WHATSAPP — VENTES

```javascript
// À ajouter dans whatsapp.service.js

// Vente comptant
vente_comptant: (secretaire, montant, produits, heure) =>
  `🛒 *Nouvelle vente enregistrée*\n\n` +
  `Secrétaire : ${secretaire.prenom} ${secretaire.nom}\n` +
  `Produits : ${produits}\n` +
  `Montant : *${formatMontant(montant)}*\n` +
  `Paiement : Comptant ✅\n` +
  `Heure : ${heure}\n\n` +
  `_AssurTrack_`,

// Vente à crédit
vente_credit: (secretaire, montant, produits, client, heure) =>
  `⚠️ *Vente à crédit enregistrée*\n\n` +
  `Secrétaire : ${secretaire.prenom} ${secretaire.nom}\n` +
  `Client : ${client.prenom} ${client.nom}\n` +
  `Produits : ${produits}\n` +
  `Montant dû : *${formatMontant(montant)}*\n` +
  `Heure : ${heure}\n\n` +
  `Connectez-vous à AssurTrack pour suivre cette dette.\n_AssurTrack_`,

// Paiement d'une dette
dette_payee: (client, montant, payePar, heure) =>
  `✅ *Dette remboursée*\n\n` +
  `Client : ${client.prenom} ${client.nom}\n` +
  `Montant encaissé : *${formatMontant(montant)}*\n` +
  `Enregistré par : ${payePar.prenom} ${payePar.nom}\n` +
  `Heure : ${heure}\n\n` +
  `_AssurTrack_`,
```

---

## MISE À JOUR DASHBOARD

Ajouter ces éléments à la page Dashboard existante :

```jsx
// Nouvelle StatCard
{ label: "CA aujourd'hui",     value: caJour,    color: "success", icon: TrendingUp }
{ label: "Dettes en cours",    value: totalDettes, color: "warning", icon: AlertCircle }

// Nouvelle section sous "Relances urgentes"
<Section title="Dernières ventes" subtitle="Aujourd'hui">
  // 5 dernières ventes avec montant + mode paiement + badge statut
</Section>
```

---

## CHECKLIST VALIDATION — MODULE COMPTABILITÉ

```
□ Enregistrer une vente comptant → apparaît dans l'historique
□ Enregistrer une vente à crédit → apparaît dans Dettes clients
□ Vente à crédit → WhatsApp patronne reçu immédiatement
□ Vente comptant → WhatsApp patronne reçu immédiatement
□ Paiement d'une dette → dette disparaît de la liste
□ Paiement d'une dette → WhatsApp patronne reçu
□ Secrétaire ne peut pas supprimer une vente
□ Patronne ne peut pas supprimer une vente
□ Page Dettes accessible par secrétaire ET patronne
□ Page Produits accessible uniquement par patronne
□ StatCards dashboard mises à jour en temps réel
```

---

## ORDRE D'INTÉGRATION

Ce module s'intègre **après** la fin de l'Étape 1 du prompt principal (frontend bouclé). Séquence :

```
1. Ajouter les nouvelles pages frontend avec données mockées
2. Valider le design (cohérence avec le design system existant)
3. Ajouter les nouvelles tables SQL dans migrations/001_init.sql
4. Créer les routes API du module ventes
5. Connecter frontend ↔ backend
6. Ajouter les templates WhatsApp
7. Tester la checklist complète
```

---

*AssurTrack — Prompt Complémentaire Comptabilité v1.0 — Parfait / Swift AI*
