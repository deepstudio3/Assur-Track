# Dockerfile optimisé pour Baileys (sans Chromium)
FROM node:20-alpine

# Installer les dépendances système minimales
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

WORKDIR /app

# Copier package.json et installer les dépendances
COPY package.json ./
RUN npm install --production

# Copier le code source
COPY src/ ./src/
COPY bridge.js ./

# Copier le script de test
COPY test-fix.js ./

# Créer le répertoire pour les authentifications
RUN mkdir -p /app/auth

# Exposer le port
EXPOSE 3010

# Variables d'environnement par défaut
ENV NODE_ENV=production \
    PORT=3010

# Démarrer l'application
CMD ["node", "src/index.js"]
