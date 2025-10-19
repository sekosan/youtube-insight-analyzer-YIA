FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-workspace.yaml tsconfig.base.json .eslintrc.cjs ./
COPY packages ./packages
COPY apps ./apps
COPY infra ./infra
RUN npm install -g pnpm && pnpm install
EXPOSE 5173
CMD ["pnpm", "--filter", "@yia/web", "dev", "--", "--host"]
