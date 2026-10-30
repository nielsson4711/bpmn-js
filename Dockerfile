# ---------- Stage 1: Build-Container ----------
FROM node:22-alpine AS build

WORKDIR /app

# Abhängigkeiten deterministisch aus package-lock.json installieren
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Quellcode kopieren und Distribution bauen (dist/)
COPY . .
RUN npm run distro

# ---------- Stage 2: OCI Runtime-Image ----------
FROM nginx:1.27-alpine AS runtime

# Gebaute Bundles + Assets (CSS, bpmn-font) und Demo-Seite übernehmen
COPY --from=build /app/dist/ /usr/share/nginx/html/
COPY container/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
