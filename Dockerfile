FROM node:22-bullseye
RUN apt-get update && apt-get install -y --no-install-recommends libreoffice-writer && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps
COPY . .
RUN npm run build
ENV NODE_ENV=production
CMD ["npm","start"]
