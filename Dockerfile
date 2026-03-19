FROM node:22-bullseye
RUN apt-get update && apt-get install -y --no-install-recommends libreoffice-writer && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build
RUN npm prune --omit=dev
ENV NODE_ENV=production
CMD ["npm","start"]
