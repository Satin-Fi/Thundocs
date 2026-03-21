FROM node:22-bullseye

# Install document processing binaries used by the backend
# - libreoffice-writer: PDF↔Word conversions
# - ghostscript: PDF compression (gs)
# - qpdf: PDF protection/unlocking
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libreoffice-writer \
    ghostscript \
    qpdf \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build
EXPOSE 10000
ENV NODE_ENV=production
CMD ["npm","start"]
