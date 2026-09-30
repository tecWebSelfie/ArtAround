# ArtAround

ArtAround is a modern web application built with Next.js and Payload CMS, extended with a LiveKit-powered voice AI agent. It combines a headless CMS, a MongoDB-backed content layer, and an interactive conversational assistant to support content-driven experiences and AI-enhanced interfaces.

## Overview

This project is designed as a flexible foundation for:

- publishing and managing structured content through Payload CMS
- serving a public-facing Next.js frontend
- supporting custom API routes and backend logic
- integrating a voice assistant through LiveKit
- testing UI, API, and end-to-end flows with modern tooling

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Payload CMS 3
- MongoDB
- LiveKit Agents
- Tailwind CSS / Mantine / UI component patterns
- Vite + Vitest + Playwright
- Storybook
- Sentry

## Project Structure

```txt
.
├── src/
│   ├── app/
│   │   ├── (frontend)           # public-facing frontend routes
│   │   ├── (payload)            # Payload admin and related setup
│   │   ├── api/                 # custom API routes
│   │   ├── my-route/            # example custom route
│   │   └── global-error.tsx
│   ├── collections/
│   │   ├── Media.ts             # media upload collection
│   │   ├── Pages.ts             # pages collection
│   │   └── Users.ts             # auth-enabled user collection
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── mocks/
│   ├── stories/
│   ├── payload.config.ts        # Payload CMS configuration
│   ├── payload-types.ts         # generated Payload types
│   ├── theme.ts
│   ├── instrumentation.ts
│   └── instrumentation-client.ts
├── my-agent/
│   └── src/
│       ├── agent.ts             # LiveKit voice AI agent
│       ├── main.ts              # agent entry point
│       ├── agent.test.ts        # agent test example
│       └── models/              # AI model/provider configuration
├── public/
├── tests/
├── .env.example
├── .env.mongo.example
├── docker-compose.yml
├── Dockerfile
├── Dockerfile.devcontainer
├── package.json
├── pnpm-lock.yaml
├── next.config.ts
├── playwright.config.ts
├── vitest.config.mts
├── README.md
├── template.compose.payload.yml
├── LICENSE
└── .gitignore
```

## Features

### Payload CMS

The app uses Payload CMS as the content and admin backbone. Key configuration includes:

- a `Users` collection for authentication
- a `Media` collection for uploaded assets
- a `Pages` collection for content pages
- MongoDB adapter and rich text editor configuration
- Stripe, redirects, import/export, nested docs, and MCP plugins

### Frontend

The public app lives under `src/app/(frontend)`. This area contains the user-facing Next.js routes and the LiveKit agent example interface.

### AI Voice Assistant

The repository includes a LiveKit-based voice AI project in `my-agent/`.

The app exposes a token endpoint at `src/app/api/token/route.ts` for LiveKit session setup, while the agent itself is configured in `my-agent/src/agent.ts`.

## Local Development

### Prerequisites

- Node.js 18.20+ or 20.9+
- pnpm
- MongoDB
- Docker (recommended for local services and LiveKit)

### Install dependencies

```bash
pnpm install
```

### Environment setup

Copy the sample environment files:

```bash
cp .env.example .env
cp .env.mongo.example .env.mongo
```

Configure the required values, including:

- `DATABASE_URL`
- `PAYLOAD_SECRET`
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

The agent also uses additional provider keys defined in `my-agent/.env.example`.

### Run the app

```bash
pnpm dev
```

Then open:

```txt
http://localhost:3000
```

### Run the LiveKit agent

```bash
pnpm agent:dev
```

or:

```bash
pnpm agent:console
```

These commands start the required services and launch the LiveKit agent in development mode.

## Docker

The repository includes Docker support for local development:

```bash
docker compose up
```

The Compose configuration includes:

- the app container
- a MongoDB container
- the LiveKit services used by the agent

## Testing

Run the full test suite with:

```bash
pnpm test
```

You can also run the test suites separately:

```bash
pnpm test:int
pnpm test:e2e
```

## Available Scripts

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm storybook
pnpm agent:dev
pnpm agent:console
pnpm generate:types
```

## Notes

ArtAround is a foundation for a content platform with AI-powered interaction. It is structured for extension and customization, with Payload collections, Next.js routes, and LiveKit agent support ready to be adapted for a production application.

## License

MIT
