FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

ARG VITE_API_BASE_URL=""
ARG VITE_API_TENANT_ID=""
ARG VITE_ENABLE_MOCK_FALLBACK=""

RUN if [ -n "${VITE_API_BASE_URL}${VITE_API_TENANT_ID}${VITE_ENABLE_MOCK_FALLBACK}" ]; then \
      printf "VITE_API_BASE_URL=%s\nVITE_API_TENANT_ID=%s\nVITE_ENABLE_MOCK_FALLBACK=%s\n" \
        "$VITE_API_BASE_URL" "$VITE_API_TENANT_ID" "$VITE_ENABLE_MOCK_FALLBACK" > .env; \
    fi

RUN yarn build

FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 4022

CMD ["serve", "-s", "dist", "-l", "4022"]
