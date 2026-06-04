# for more information follow guide at https://turborepo.com/docs/guides/tools/docker
# ensure the nextjs app has standalone output in the nextjs config options
FROM node:22-alpine AS base
# enable pnpm and install latest pnpm
RUN corepack enable pnpm && corepack install -g pnpm@latest
# setup pnpm home to enable gloabl installs
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"

FROM base AS builder

# Adds missing shared libraries. Reference https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine for more context
RUN apk update
RUN apk add --no-cache libc6-compat

WORKDIR /app
RUN pnpm add turbo --global
COPY . .
RUN turbo prune health-portal --docker

# add lockfiles and package.json 's of' isolated workspaces
FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=builder /app/out/json/ .
RUN pnpm install

# build health portal app
COPY --from=builder /app/out/full/ .

# Add cachind below for remote caching
# ARG TURBO_TEAM
# ENV TURBO_TEAM=$TURBO_TEAM

# ARG TURBO_TOKEN
# ENV TURBO_TOKEN=$TURBO_TOKEN

RUN pnpm turbo build

FROM base AS runner
WORKDIR /app
# production run
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=installer --chown=nextjs:nodejs /app/apps/health-portal/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/health-portal/.next/static ./apps/health-portal/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/health-portal/public ./apps/health-portal/public

CMD ["node", "apps/health-portal/server.js"]
