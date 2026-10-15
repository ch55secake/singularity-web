# Build the static app, then serve it with nginx. rake only needs Docker; Node
# stays inside the build stage.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts svelte.config.js tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM nginx:1.29-alpine
# The nginx image runs envsubst on templates at startup, filling in the API upstream.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV SINGULARITY_API_UPSTREAM=http://platform:8080
# Read token for the platform API, if it requires one. Set at runtime.
ENV SINGULARITY_API_TOKEN=
EXPOSE 80
