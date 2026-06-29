# Déploiement d'AssurTrack en production (kamillendi.com)

Ce guide déploie toute la stack (frontend + API + PostgreSQL + WhatsFlow) derrière
**Caddy**, qui gère le HTTPS automatiquement.

Architecture publique :

```
Internet ──► Caddy (80/443) ──► /api/*  ──► backend:4000
                              └► /*      ──► frontend:80 (Nginx)
```

Tout le reste (PostgreSQL, Redis, WhatsFlow) est **interne** au réseau Docker,
jamais exposé sur Internet.

---

## 1. Prérequis serveur

- Un VPS Linux (Ubuntu 22.04+ recommandé), **2 vCPU / 4 Go RAM minimum**
  (Postgres ×2 + Redis + moteur Baileys + builds).
- **Docker** et **Docker Compose v2** installés :
  ```bash
  curl -fsSL https://get.docker.com | sh
  ```
- Le code du projet copié sur le serveur (git clone ou rsync).

## 2. DNS

Chez ton registrar, créer deux enregistrements **A** vers l'IP publique du serveur :

| Type | Nom   | Valeur            |
|------|-------|-------------------|
| A    | `@`   | `IP_DU_SERVEUR`   |
| A    | `www` | `IP_DU_SERVEUR`   |

Attendre la propagation (`ping kamillendi.com` doit renvoyer l'IP du serveur)
**avant** de démarrer Caddy, sinon Let's Encrypt échouera.

## 3. Pare-feu

Ouvrir **uniquement** 22 (SSH), 80 et 443 :

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## 4. Variables d'environnement

```bash
cd /chemin/vers/AssurTrack
cp .env.prod.example .env
nano .env
```

Remplir **tous** les secrets. Générer chaque secret avec :

```bash
openssl rand -hex 32
```

À renseigner : `POSTGRES_PASSWORD`, `JWT_SECRET`, `WHATSFLOW_DB_PASSWORD`,
`WHATSFLOW_JWT_SECRET`, `WHATSFLOW_INTERNAL_TOKEN`, ainsi que le **compte patronne
initial** (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) et les infos de l'entreprise.
Laisser `WHATSFLOW_API_KEY` / `WHATSFLOW_CLIENT_ID` vides pour l'instant (étape 6).

> ⚠️ Les secrets qui étaient en clair dans `docker-compose.yml` (dev) sont
> publics sur GitHub : **ne pas les réutiliser**, en générer de nouveaux.

## 5. Premier démarrage

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Le backend applique automatiquement les migrations **(sans aucune donnée de
démonstration)** puis crée l'entreprise et le compte patronne définis dans le
`.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`). La base démarre donc vide, prête pour
les vrais contrats.

Vérifier :

```bash
docker compose -f docker-compose.prod.yml ps
curl https://kamillendi.com/health      # → {"status":"ok",...}
```

Ouvrir **https://kamillendi.com** → se connecter avec `ADMIN_EMAIL` /
`ADMIN_PASSWORD`. La page doit s'afficher en HTTPS.

> 🔐 Le compte patronne est créé une seule fois (bootstrap idempotent).
> Changer `ADMIN_PASSWORD` dans le `.env` après coup ne modifie pas le mot de
> passe : il se change depuis l'application.

## 6. Activer WhatsApp (une seule fois)

WhatsFlow n'est pas exposé publiquement ; on le joint en local via SSH.

1. Créer le client WhatsFlow :
   ```bash
   curl -X POST http://127.0.0.1:8011/api/clients/ \
     -H "Content-Type: application/json" \
     -d '{"name":"AssurTrack","email":"kountchouryan@gmail.com"}'
   ```
   La réponse contient `api_key` et `id`.

2. Coller ces valeurs dans `.env` :
   ```
   WHATSFLOW_API_KEY=...
   WHATSFLOW_CLIENT_ID=...
   ```

3. Recharger le backend :
   ```bash
   docker compose -f docker-compose.prod.yml up -d backend
   ```

4. Dans l'app (**Paramètres → WhatsApp**), scanner le **QR code** avec le
   téléphone de l'entreprise pour connecter la session.

> La session WhatsApp (auth Baileys) est persistée dans la base `whatsflow`
> (volume `whatsflow_pgdata`) : elle survit aux redémarrages. Ne pas supprimer
> ce volume sous peine de devoir rescanner le QR.

## 7. Sauvegardes de la base

Rendre le script exécutable et le planifier :

```bash
chmod +x scripts/backup-db.sh
crontab -e
# Ajouter (sauvegarde quotidienne à 02h00) :
0 2 * * * /chemin/vers/AssurTrack/scripts/backup-db.sh >> /var/log/assurtrack-backup.log 2>&1
```

Restaurer une sauvegarde :

```bash
gunzip -c /var/backups/assurtrack/assurtrack_AAAAMMJJ_HHMMSS.sql.gz \
  | docker exec -i assurtrack-db psql -U assurtrack_user -d assurtrack
```

---

## Opérations courantes

| Action | Commande |
|--------|----------|
| Logs API | `docker compose -f docker-compose.prod.yml logs -f backend` |
| Logs Caddy (certificats) | `docker compose -f docker-compose.prod.yml logs -f caddy` |
| Redémarrer | `docker compose -f docker-compose.prod.yml restart` |
| Mettre à jour le code | `git pull && docker compose -f docker-compose.prod.yml up -d --build` |
| Tout arrêter | `docker compose -f docker-compose.prod.yml down` |

> Le fichier `docker-compose.yml` reste la configuration de **développement**
> (ports ouverts, mode dev). En production, toujours utiliser
> `-f docker-compose.prod.yml`.
