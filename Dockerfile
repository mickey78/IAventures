# Utiliser une image Node.js LTS comme base
FROM node:18-alpine AS base

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier les fichiers package.json et les fichiers de lock
COPY package.json ./
# Utiliser npm ci pour une installation plus rapide et déterministe si package-lock.json existe
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi


# Étape de construction (Builder)
FROM base AS builder
WORKDIR /app
# Copier tout le code source (sauf ce qui est ignoré par .dockerignore)
COPY . .
# Construire l'application Next.js
RUN npm run build


# Étape de production (Runner)
FROM node:18-alpine AS runner
WORKDIR /app

# Définir les variables d'environnement
ENV NODE_ENV=production
# La clé API sera fournie via --env-file ou -e lors du 'docker run'
# ENV GOOGLE_GENAI_API_KEY=YOUR_API_KEY_HERE # Ne pas mettre la clé ici

# Copier les dépendances de production depuis l'étape 'base'
COPY --from=base /app/node_modules ./node_modules
# Copier les fichiers de l'application construite depuis l'étape 'builder'
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
# Copier les fichiers de configuration nécessaires
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/components.json ./components.json
COPY --from=builder /app/tailwind.config.ts ./tailwind.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Exposer le port sur lequel l'application Next.js s'exécute
EXPOSE 9002

# Définir la commande pour démarrer l'application
# Utiliser l'hôte 0.0.0.0 pour permettre l'accès depuis l'extérieur du conteneur
CMD ["npm", "start", "--", "-p", "9002", "-H", "0.0.0.0"]
