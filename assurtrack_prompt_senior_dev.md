# AssurTrack — Prompt Maître pour Agent IA Senior Full Stack
> Version 1.0 — Parfait / Swift AI  
> Stack : React (Vite) + Node.js/Express + PostgreSQL + Docker Compose  
> Déploiement initial : machine locale pour tests

---

## CONTEXTE PRODUIT

Tu construis **AssurTrack**, un SaaS B2B camerounais à destination des entreprises d'assurance. Il comporte deux modules :

1. **Module Relance** — Système de rappels automatiques de renouvellement de contrats d'assurance (J-30, J-7, J-0) envoyés par WhatsApp aux clients, gérants et responsables.
2. **Module Caisse Patronne** — Registre interne et sécurisé permettant à la patronne d'une entreprise de tracer chaque fois qu'une secrétaire lui avance de l'argent de la caisse pour ses dépenses personnelles. Elle seule peut valider les remboursements. Chaque opération déclenche un message WhatsApp en temps réel vers son numéro.

L'intégration WhatsApp se fait via **Swift AI / WhatsFlow** — une infrastructure WhatsApp déjà opérationnelle (API interne disponible, documentée plus bas).

---

## RÈGLE ABSOLUE — ORDRE D'EXÉCUTION

Tu travailles **étape par étape**. Tu ne passes à l'étape suivante que lorsque la précédente est **100% terminée et validée**. Commence toujours par boucler le **frontend complet** avant de toucher au backend.

```
ÉTAPE 1 → Frontend complet (toutes les pages, design, navigation)
ÉTAPE 2 → Backend API (Express + PostgreSQL)
ÉTAPE 3 → Connexion Frontend ↔ Backend
ÉTAPE 4 → Intégration WhatsApp (Swift AI)
ÉTAPE 5 → Docker Compose (déploiement local)
ÉTAPE 6 → Tests end-to-end
```

---

## ÉTAPE 1 — FRONTEND REACT (VITE)

### 1.1 — Initialisation du projet

```bash
npm create vite@latest assurtrack-frontend -- --template react
cd assurtrack-frontend
npm install react-router-dom axios date-fns react-hot-toast lucide-react @tanstack/react-query zustand framer-motion recharts
```

### 1.2 — Design System — LA DIFFÉRENCE ENTRE 10$ ET 10 000$

C'est ici que tout se joue. Le design doit être **premium, africain, professionnel**. Voici les règles non négociables :

#### Palette de couleurs
```css
:root {
  /* Primaire — Bleu nuit profond (confiance, finance, assurance) */
  --primary-900: #0A1628;
  --primary-800: #0F2044;
  --primary-700: #162D5E;
  --primary-600: #1E3A78;
  --primary-500: #2548A0;
  --primary-400: #3D64C8;
  --primary-300: #6B8FE0;
  --primary-200: #A8C0F0;
  --primary-100: #D4E2FA;
  --primary-50:  #EBF1FD;

  /* Accent — Or camerounais (premium, local, chaleur) */
  --gold-900: #3D2500;
  --gold-700: #7A4A00;
  --gold-500: #C47A00;
  --gold-400: #E89A0A;
  --gold-300: #F5B730;
  --gold-200: #FAD47A;
  --gold-100: #FDF0C0;
  --gold-50:  #FEFAE8;

  /* Sémantiques */
  --success-500: #1A7A4A;
  --success-100: #D4F5E5;
  --danger-500:  #A32020;
  --danger-100:  #FAE0E0;
  --warning-500: #8A5200;
  --warning-100: #FEF0CC;

  /* Neutres */
  --gray-950: #0C0E12;
  --gray-900: #14171F;
  --gray-800: #1E2330;
  --gray-700: #2C3347;
  --gray-600: #4A5268;
  --gray-500: #6B7494;
  --gray-400: #959DB8;
  --gray-300: #C2C8D8;
  --gray-200: #DDE2EE;
  --gray-100: #EEF1F8;
  --gray-50:  #F7F9FC;
  --white:    #FFFFFF;

  /* Surfaces */
  --surface-bg:      #F4F7FF;
  --surface-card:    #FFFFFF;
  --surface-sidebar: #0A1628;
}
```

#### Typographie
```css
/* Importer depuis Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');

:root {
  --font-display: 'DM Serif Display', Georgia, serif;   /* Titres premium */
  --font-body:    'Plus Jakarta Sans', system-ui, sans-serif; /* Interface */
}
```

#### Règles de design
- **Sidebar sombre** (--primary-900) avec icônes et texte clairs — effet premium immédiat
- **Cards blanches** avec ombre subtile : `box-shadow: 0 1px 3px rgba(10,22,40,0.08), 0 4px 16px rgba(10,22,40,0.04)`
- **Accent or** sur les éléments d'action principaux (boutons CTA, badges actifs, indicateurs clés)
- **Micro-animations** avec Framer Motion sur : apparition des cards, transitions de pages, états de chargement
- **Bordures ultra-fines** : `1px solid var(--gray-100)` — jamais épais
- **Border-radius** : 12px pour les cards, 8px pour les inputs, 24px pour les badges/pills
- **Espacement généreux** : padding minimum 24px dans les cards, 32px entre les sections
- **Typographie hiérarchisée** : titres en DM Serif Display, corps en Plus Jakarta Sans

---

### 1.3 — Structure des fichiers frontend

```
src/
├── assets/
│   └── logo.svg                    # Logo AssurTrack (à créer)
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx             # Navigation principale
│   │   ├── TopBar.jsx              # Barre du haut avec user + notifs
│   │   └── PageWrapper.jsx         # Wrapper avec animation d'entrée
│   ├── ui/
│   │   ├── Button.jsx              # Bouton réutilisable (variants)
│   │   ├── Badge.jsx               # Badges statut
│   │   ├── Card.jsx                # Card de base
│   │   ├── StatCard.jsx            # Card métrique chiffre
│   │   ├── Input.jsx               # Input stylisé
│   │   ├── Modal.jsx               # Modal générique
│   │   ├── Table.jsx               # Table réutilisable
│   │   ├── EmptyState.jsx          # État vide illustré
│   │   └── Loader.jsx              # Spinner premium
│   ├── whatsapp/
│   │   └── WhatsAppStatus.jsx      # Indicateur connexion WA
│   └── notifications/
│       └── NotificationPanel.jsx   # Panneau notifications
├── pages/
│   ├── auth/
│   │   └── Login.jsx               # Page connexion
│   ├── dashboard/
│   │   └── Dashboard.jsx           # Vue d'ensemble
│   ├── relance/
│   │   ├── RelanceList.jsx         # Liste des contrats
│   │   ├── RelanceForm.jsx         # Ajouter/éditer un contrat
│   │   └── RelanceCalendar.jsx     # Vue calendrier des échéances
│   ├── caisse/
│   │   ├── CaissePatronne.jsx      # Page principale patronne
│   │   ├── OperationForm.jsx       # Formulaire secrétaire (enreg. opération)
│   │   └── HistoriqueRemb.jsx      # Historique remboursements
│   ├── clients/
│   │   └── ClientsList.jsx         # Gestion des clients assurés
│   ├── settings/
│   │   └── Settings.jsx            # Paramètres (numéros, templates WA)
│   └── NotFound.jsx
├── store/
│   ├── authStore.js                # Zustand — auth
│   └── notifStore.js               # Zustand — notifications temps réel
├── hooks/
│   ├── useOperations.js            # React Query — opérations caisse
│   ├── useContrats.js              # React Query — contrats relance
│   └── useWhatsApp.js              # Statut WA
├── api/
│   └── client.js                   # Instance Axios configurée
├── utils/
│   ├── formatCurrency.js           # 25000 → "25 000 FCFA"
│   ├── formatDate.js               # Dates en français
│   └── roleGuard.js                # Contrôle accès par rôle
├── router/
│   └── index.jsx                   # Routes protégées par rôle
└── main.jsx
```

---

### 1.4 — Pages à construire (détail complet)

#### PAGE 1 : Login (`/login`)
- Logo AssurTrack centré en haut (grand, avec tagline "Gérez. Relancez. Protégez.")
- Fond : gradient subtil --primary-900 → --primary-700
- Card blanche centrale avec : champ email, champ password, bouton "Se connecter"
- Animation d'entrée : card monte du bas avec fade-in (Framer Motion)
- Gestion d'erreur inline (pas de toast pour les erreurs d'auth)

#### PAGE 2 : Dashboard (`/`)
- TopBar : "Bonjour, [Prénom]" + date du jour en français + avatar initiales
- 4 StatCards en grille : Contrats actifs / Relances ce mois / Opérations en attente / Total dû patronne
- Section "Relances urgentes" : liste des 5 contrats expirant dans les 7 prochains jours, avec badge rouge J-X
- Section "Dernières opérations caisse" : 3 dernières opérations avec statut (visible uniquement si rôle = patronne)
- Graphique recharts : courbe des relances envoyées sur 30 jours

#### PAGE 3 : Module Relance — Liste des contrats (`/relance`)
- Header avec titre + bouton "+ Nouveau contrat" (accent or)
- Filtres en pills : Tous / Actifs / Expirés / En cours de relance
- Table avec colonnes : Client / N° Police / Date souscription / Date expiration / Statut / J-X / Actions
- Colonne J-X colorée : rouge si ≤7j, orange si ≤30j, vert sinon
- Action par ligne : Voir détail / Envoyer rappel manuel / Modifier
- Pagination 20 par page

#### PAGE 4 : Ajouter un contrat (`/relance/nouveau`)
- Formulaire en deux colonnes :
  - Gauche : Informations client (nom, prénom, téléphone WhatsApp, email optionnel)
  - Droite : Informations contrat (N° police, type d'assurance, date souscription, date expiration, montant prime)
- Prévisualisation en temps réel du message WhatsApp qui sera envoyé (card mockup téléphone)
- Bouton "Enregistrer le contrat" — déclenche confirmation avec résumé

#### PAGE 5 : Module Caisse Patronne (`/caisse`)

> ⚠️ Cette page est **visible uniquement par le rôle "patronne"**. Les secrétaires voient uniquement le formulaire d'enregistrement.

**Vue patronne :**
- Bannière verte : "Chaque opération vous est notifiée en temps réel sur WhatsApp"
- 4 StatCards : Total avancé ce mois / Total remboursé / Reste dû / Nombre d'opérations
- Filtres : Tout / Non remboursé / Remboursé / Par secrétaire
- Table complète :
  - Colonnes : Date & heure / Secrétaire / Montant avancé / Motif / Statut / Action
  - Statut badges : "Dû" (rouge) / "Remboursé" (vert)
  - Action : bouton "Marquer remboursé" — **uniquement visible et cliquable pour la patronne**
  - Une fois remboursé : date + heure de validation s'affichent, bouton disparaît, statut passe en vert
- Modal de confirmation avant tout remboursement : "Confirmer le remboursement de 25 000 FCFA avancé par Marie N. le 24 juin 2026 ?"

**Vue secrétaire (`/caisse/nouvelle-operation`) :**
- Formulaire simple :
  - Montant avancé (input numérique en FCFA)
  - Motif (texte libre)
  - Confirmation : "Je certifie avoir avancé ce montant à la patronne"
  - Bouton "Enregistrer"
- Après soumission : message de confirmation + indication "La patronne a été notifiée sur WhatsApp"
- La secrétaire **ne voit pas** les opérations des autres secrétaires, ni le statut de remboursement

#### PAGE 6 : Paramètres (`/settings`)
- Section "Numéros WhatsApp" : numéro de la patronne, numéro du gérant
- Section "Templates de messages" : éditeur des messages envoyés (J-30, J-7, J-0, opération caisse)
- Section "Gestion des utilisateurs" : ajouter/désactiver une secrétaire

---

### 1.5 — Composant Sidebar

```jsx
// Navigation items avec icônes Lucide
const navItems = [
  { icon: LayoutDashboard, label: "Tableau de bord", path: "/" },
  { icon: RefreshCw,       label: "Relances",         path: "/relance" },
  { icon: Users,           label: "Clients",           path: "/clients" },
  { icon: Wallet,          label: "Caisse patronne",   path: "/caisse", roles: ["patronne", "secretaire"] },
  { icon: Settings,        label: "Paramètres",        path: "/settings", roles: ["patronne"] },
];
```

- Sidebar fixe à gauche, fond --primary-900
- Logo AssurTrack en haut (blanc)
- Item actif : fond --primary-700 + bordure gauche or (3px solid --gold-400)
- Indicateur WhatsApp en bas : point vert animé + "WhatsApp connecté"
- Nom utilisateur + rôle + bouton déconnexion en bas

---

## ÉTAPE 2 — BACKEND (Node.js / Express / PostgreSQL)

### 2.1 — Structure du projet backend

```
assurtrack-backend/
├── src/
│   ├── config/
│   │   ├── database.js         # Pool PostgreSQL
│   │   └── env.js              # Variables d'environnement validées
│   ├── middleware/
│   │   ├── auth.js             # Vérification JWT
│   │   ├── roleGuard.js        # Vérif rôle (patronne / secretaire / admin)
│   │   └── errorHandler.js     # Gestion erreurs globale
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   └── auth.service.js
│   │   ├── contrats/
│   │   │   ├── contrats.routes.js
│   │   │   ├── contrats.controller.js
│   │   │   └── contrats.service.js
│   │   ├── operations/
│   │   │   ├── operations.routes.js
│   │   │   ├── operations.controller.js
│   │   │   └── operations.service.js
│   │   ├── relances/
│   │   │   ├── relances.routes.js
│   │   │   └── relances.service.js
│   │   └── whatsapp/
│   │       └── whatsapp.service.js
│   ├── jobs/
│   │   └── relancesCron.js     # Cron quotidien — vérif des échéances
│   └── app.js
├── migrations/
│   └── 001_init.sql
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

### 2.2 — Schéma base de données

```sql
-- migrations/001_init.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Utilisateurs (patronne, secrétaires, admins)
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom           VARCHAR(100) NOT NULL,
  prenom        VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('patronne', 'secretaire', 'admin')),
  telephone_wa  VARCHAR(20),               -- Numéro WhatsApp pour notifications
  entreprise_id UUID,
  actif         BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Entreprises clientes du SaaS
CREATE TABLE entreprises (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom           VARCHAR(255) NOT NULL,
  telephone_gerant  VARCHAR(20),
  telephone_responsable VARCHAR(20),
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Clients assurés
CREATE TABLE clients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID REFERENCES entreprises(id),
  nom           VARCHAR(100) NOT NULL,
  prenom        VARCHAR(100) NOT NULL,
  telephone_wa  VARCHAR(20) NOT NULL,      -- Numéro pour les relances
  email         VARCHAR(255),
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Contrats d'assurance
CREATE TABLE contrats (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id     UUID REFERENCES entreprises(id),
  client_id         UUID REFERENCES clients(id),
  numero_police     VARCHAR(100) UNIQUE NOT NULL,
  type_assurance    VARCHAR(100) NOT NULL,
  date_souscription DATE NOT NULL,
  date_expiration   DATE NOT NULL,
  montant_prime     DECIMAL(15,2),
  statut            VARCHAR(20) DEFAULT 'actif' CHECK (statut IN ('actif', 'expire', 'renouvele', 'suspendu')),
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMP DEFAULT NOW()
);

-- Relances envoyées (historique complet)
CREATE TABLE relances (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contrat_id    UUID REFERENCES contrats(id),
  type_relance  VARCHAR(10) NOT NULL CHECK (type_relance IN ('J-30', 'J-7', 'J-0')),
  canal         VARCHAR(20) DEFAULT 'whatsapp',
  destinataire  VARCHAR(20) NOT NULL,      -- Numéro de téléphone
  message       TEXT NOT NULL,
  statut        VARCHAR(20) DEFAULT 'envoye' CHECK (statut IN ('envoye', 'echec', 'en_attente')),
  envoye_at     TIMESTAMP DEFAULT NOW()
);

-- Opérations caisse patronne (IMMUABLE — jamais DELETE)
CREATE TABLE operations_caisse (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id   UUID REFERENCES entreprises(id),
  secretaire_id   UUID REFERENCES users(id),
  montant         DECIMAL(15,2) NOT NULL,
  motif           TEXT,
  statut          VARCHAR(20) DEFAULT 'du' CHECK (statut IN ('du', 'rembourse')),
  -- Champs remboursement (remplis uniquement par la patronne)
  rembourse_at    TIMESTAMP,
  rembourse_par   UUID REFERENCES users(id),   -- doit être rôle=patronne
  -- Immuabilité : pas de soft delete, pas d'update du montant
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Index utiles
CREATE INDEX idx_contrats_expiration ON contrats(date_expiration);
CREATE INDEX idx_operations_entreprise ON operations_caisse(entreprise_id);
CREATE INDEX idx_relances_contrat ON relances(contrat_id);
```

### 2.3 — Routes API complètes

```
POST   /api/auth/login              → Connexion, retourne JWT
POST   /api/auth/logout             → Révocation token
GET    /api/auth/me                 → Profil utilisateur courant

GET    /api/contrats                → Liste paginée (filtre: statut, date)
POST   /api/contrats                → Créer un contrat (déclenche WA)
GET    /api/contrats/:id            → Détail d'un contrat
PUT    /api/contrats/:id            → Modifier un contrat
DELETE /api/contrats/:id            → Désactiver (soft delete)

GET    /api/operations              → Liste opérations caisse (patronne only)
POST   /api/operations              → Enregistrer une avance (secretaire)
PATCH  /api/operations/:id/rembourser  → Marquer remboursé (patronne ONLY)

GET    /api/relances                → Historique des relances envoyées
POST   /api/relances/manuel/:contrat_id → Envoyer relance manuelle

GET    /api/dashboard/stats         → Métriques pour le dashboard
```

### 2.4 — Logique critique — Immuabilité des opérations caisse

```javascript
// operations.service.js

// RÈGLE : une opération enregistrée ne peut JAMAIS être supprimée
// RÈGLE : le montant ne peut JAMAIS être modifié après création
// RÈGLE : seule la patronne peut appeler marquerRembourse()

async function marquerRembourse(operationId, patronneId) {
  // 1. Vérifier que l'utilisateur est bien de rôle "patronne"
  const user = await getUserById(patronneId);
  if (user.role !== 'patronne') {
    throw new ForbiddenError("Seule la patronne peut valider un remboursement");
  }

  // 2. Vérifier que l'opération n'est pas déjà remboursée
  const op = await getOperationById(operationId);
  if (op.statut === 'rembourse') {
    throw new ConflictError("Cette opération est déjà marquée comme remboursée");
  }

  // 3. Mettre à jour avec timestamp et ID patronne
  return db.query(
    `UPDATE operations_caisse 
     SET statut = 'rembourse', rembourse_at = NOW(), rembourse_par = $1
     WHERE id = $2 AND statut = 'du'
     RETURNING *`,
    [patronneId, operationId]
  );
}
```

---

## ÉTAPE 3 — CONNEXION FRONTEND ↔ BACKEND

### 3.1 — Configuration Axios

```javascript
// src/api/client.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 10000,
});

// Intercepteur : ajoute le JWT à chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('assurtrack_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Intercepteur : redirige vers /login si 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('assurtrack_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
```

### 3.2 — React Query — Hooks principaux

```javascript
// hooks/useOperations.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import toast from 'react-hot-toast';

export function useOperations(filters = {}) {
  return useQuery({
    queryKey: ['operations', filters],
    queryFn: () => api.get('/operations', { params: filters }).then(r => r.data),
  });
}

export function useMarquerRembourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/operations/${id}/rembourser`),
    onSuccess: () => {
      qc.invalidateQueries(['operations']);
      qc.invalidateQueries(['dashboard']);
      toast.success('Remboursement validé');
    },
    onError: () => toast.error('Erreur lors de la validation'),
  });
}
```

---

## ÉTAPE 4 — INTÉGRATION WHATSAPP (SWIFT AI / WHATSFLOW)

### 4.1 — Service WhatsApp interne

```javascript
// src/modules/whatsapp/whatsapp.service.js

const WHATSFLOW_URL   = process.env.WHATSFLOW_URL;    // ex: http://localhost:3001
const INTERNAL_TOKEN  = process.env.WHATSFLOW_TOKEN;  // whatsflow-internal-2026
const CLIENT_UUID     = process.env.WHATSFLOW_CLIENT; // 852ed5d0-25c6-...

async function envoyerMessage(telephone, message) {
  // Formater le numéro camerounais → format international
  const numero = formatNumeroCameroun(telephone); // ex: 6XXXXXXXX → 2376XXXXXXXX

  const response = await fetch(`${WHATSFLOW_URL}/api/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${INTERNAL_TOKEN}`,
      'X-Client-UUID': CLIENT_UUID,
    },
    body: JSON.stringify({
      to: numero,
      message: message,
      type: 'text',
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`WhatsApp error: ${err.message}`);
  }
  return response.json();
}

function formatNumeroCameroun(tel) {
  const clean = tel.replace(/\D/g, '');
  if (clean.startsWith('237')) return `+${clean}`;
  if (clean.length === 9) return `+237${clean}`;
  throw new Error(`Numéro camerounais invalide : ${tel}`);
}
```

### 4.2 — Templates de messages WhatsApp

```javascript
const TEMPLATES = {
  // Relances contrat
  relance_J30: (client, contrat) => 
    `Bonjour ${client.prenom} 👋\n\nVotre contrat d'assurance *${contrat.type_assurance}* (N° ${contrat.numero_police}) expire dans *30 jours*, le ${formatDate(contrat.date_expiration)}.\n\nContactez-nous maintenant pour renouveler votre couverture.\n\n_AssurTrack_`,

  relance_J7: (client, contrat) =>
    `⚠️ Rappel urgent — Bonjour ${client.prenom}\n\nVotre contrat *${contrat.type_assurance}* expire dans *7 jours*.\n\nRenouvelez dès aujourd'hui pour éviter toute interruption de couverture.\n\n_AssurTrack_`,

  relance_J0: (client, contrat) =>
    `🔴 *EXPIRATION AUJOURD'HUI*\n\nBonjour ${client.prenom}, votre contrat *${contrat.type_assurance}* (N° ${contrat.numero_police}) expire ce jour.\n\nContactez immédiatement votre agence.\n\n_AssurTrack_`,

  // Notification opération caisse (vers la patronne)
  nouvelle_operation: (secretaire, montant, motif, heure) =>
    `💰 *Nouvelle opération enregistrée*\n\n` +
    `Secrétaire : ${secretaire.prenom} ${secretaire.nom}\n` +
    `Montant avancé : *${formatMontant(montant)}*\n` +
    `Motif : ${motif}\n` +
    `Heure : ${heure}\n\n` +
    `Connectez-vous à AssurTrack pour valider le remboursement.\n_AssurTrack_`,
};
```

### 4.3 — Cron job — Relances automatiques

```javascript
// src/jobs/relancesCron.js
import cron from 'node-cron';
import { verifierEcheances } from '../modules/relances/relances.service.js';

// Exécution chaque matin à 8h00 (heure de Douala = UTC+1)
cron.schedule('0 7 * * *', async () => {
  console.log('[CRON] Vérification des échéances en cours...');
  await verifierEcheances();
}, { timezone: 'Africa/Douala' });

// relances.service.js — verifierEcheances()
// 1. SELECT contrats WHERE date_expiration = TODAY + 30 → envoyer J-30
// 2. SELECT contrats WHERE date_expiration = TODAY + 7  → envoyer J-7
// 3. SELECT contrats WHERE date_expiration = TODAY      → envoyer J-0
// Pour chaque contrat trouvé :
//   - Envoyer WA au client
//   - Envoyer WA au gérant de l'entreprise
//   - Envoyer WA au responsable de l'entreprise
//   - Logger dans table relances
```

---

## ÉTAPE 5 — DOCKER COMPOSE (DÉPLOIEMENT LOCAL)

### 5.1 — Dockerfile backend

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/
COPY migrations/ ./migrations/

EXPOSE 4000

CMD ["node", "src/app.js"]
```

### 5.2 — docker-compose.yml

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: assurtrack-db
    restart: unless-stopped
    environment:
      POSTGRES_DB:       assurtrack
      POSTGRES_USER:     assurtrack_user
      POSTGRES_PASSWORD: assurtrack_secret_2026
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations/001_init.sql:/docker-entrypoint-initdb.d/001_init.sql
    ports:
      - "5432:5432"
    networks:
      - assurtrack-net

  backend:
    build: .
    container_name: assurtrack-api
    restart: unless-stopped
    depends_on:
      - postgres
    environment:
      NODE_ENV:           development
      PORT:               4000
      DATABASE_URL:       postgresql://assurtrack_user:assurtrack_secret_2026@postgres:5432/assurtrack
      JWT_SECRET:         assurtrack-jwt-secret-change-in-prod-2026
      WHATSFLOW_URL:      ${WHATSFLOW_URL}
      WHATSFLOW_TOKEN:    whatsflow-internal-2026
      WHATSFLOW_CLIENT:   852ed5d0-25c6-4f0b-b942-6023a55c5ca4
    ports:
      - "4000:4000"
    networks:
      - assurtrack-net
    volumes:
      - ./src:/app/src   # Hot reload en dev

  frontend:
    build:
      context: ./assurtrack-frontend
      dockerfile: Dockerfile.dev
    container_name: assurtrack-frontend
    restart: unless-stopped
    environment:
      VITE_API_URL: http://localhost:4000/api
    ports:
      - "5173:5173"
    networks:
      - assurtrack-net
    volumes:
      - ./assurtrack-frontend/src:/app/src

networks:
  assurtrack-net:
    driver: bridge

volumes:
  postgres_data:
```

### 5.3 — Dockerfile.dev (frontend)

```dockerfile
# assurtrack-frontend/Dockerfile.dev
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

### 5.4 — Commandes de démarrage

```bash
# Cloner le repo et démarrer
git clone https://github.com/[ton-repo]/assurtrack.git
cd assurtrack

# Créer le fichier .env
cp .env.example .env
# Remplir WHATSFLOW_URL avec l'URL locale de Swift AI

# Démarrer tout
docker compose up --build

# Accès :
# Frontend : http://localhost:5173
# API      : http://localhost:4000
# DB       : localhost:5432
```

---

## ÉTAPE 6 — TESTS ET VÉRIFICATION

### Checklist avant de passer à l'étape suivante

```
FRONTEND (Étape 1) :
□ Toutes les pages s'affichent sans erreur console
□ Navigation entre pages fluide (pas de rechargement)
□ Design cohérent sur toutes les pages
□ Responsive (tablette + desktop minimum)
□ Formulaires avec validation côté client
□ États vides gérés (EmptyState)
□ États de chargement gérés (Skeleton / Spinner)
□ Rôles appliqués (patronne ne voit pas ce que secrétaire voit)

BACKEND (Étape 2) :
□ Toutes les routes répondent correctement
□ JWT fonctionne (login → token → routes protégées)
□ Rôle "patronne" bloqué sur route rembourser si secrétaire
□ Opération caisse : montant non modifiable après création
□ Cron job se déclenche (log console à 8h)

INTÉGRATION (Étape 3) :
□ Login frontend → JWT → requêtes API fonctionnelles
□ Création contrat → apparaît en liste
□ Nouvelle opération caisse → notification WhatsApp reçue
□ Validation remboursement → statut mis à jour en temps réel

DOCKER (Étape 5) :
□ docker compose up démarre sans erreur
□ Migrations SQL appliquées automatiquement
□ Frontend accessible sur :5173
□ API accessible sur :4000
□ Connexion DB opérationnelle
```

---

## VARIABLES D'ENVIRONNEMENT

```bash
# .env.example

# Backend
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://assurtrack_user:assurtrack_secret_2026@postgres:5432/assurtrack
JWT_SECRET=change-this-in-production

# WhatsApp / Swift AI
WHATSFLOW_URL=http://host.docker.internal:3001   # ou URL de ton WhatsFlow local
WHATSFLOW_TOKEN=whatsflow-internal-2026
WHATSFLOW_CLIENT=852ed5d0-25c6-4f0b-b942-6023a55c5ca4

# Frontend (Vite)
VITE_API_URL=http://localhost:4000/api
```

---

## NOTES IMPORTANTES POUR L'AGENT

1. **Ne jamais permettre à une secrétaire de voir les opérations des autres secrétaires** — filtrer par `secretaire_id` côté API.

2. **Ne jamais permettre la suppression d'une opération caisse** — ni côté API (pas de route DELETE), ni côté base de données (pas de soft delete, pas de colonne `deleted_at`).

3. **Le bouton "Marquer remboursé"** côté frontend doit être rendu conditionnel sur `user.role === 'patronne'` ET côté backend la route doit revérifier le rôle dans le middleware — défense en profondeur.

4. **Format des numéros camerounais** : toujours normaliser en `+2376XXXXXXXX` avant d'envoyer vers WhatsFlow.

5. **Le design est non négociable** : la palette bleu nuit + or camerounais + typographie DM Serif Display/Plus Jakarta Sans est le coeur de l'identité visuelle. Aucun composant UI library (MUI, Ant Design, Chakra) — tout est custom CSS modules ou Tailwind avec la palette définie.

6. **Commencer par le frontend** : construire et boucler toutes les pages avec des données mockées (JSON statique) avant de toucher au backend. C'est ce qui permet de valider le design rapidement.
```

---

*AssurTrack — Prompt v1.0 — Généré pour Parfait / Swift AI*
