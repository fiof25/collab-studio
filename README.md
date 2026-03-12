# Collab AI Studio

A shared visual canvas for collaborative vibe coding. Teams build HTML prototypes through AI chat, then organize, fork, and merge their work on a visual branch tree — like visual version control for prototypes.

## What It Does

- **Vibe code with AI** — describe what you want in chat, get live HTML prototypes
- **Visual version control** — see your project as a tree of branches on a canvas, not a text list
- **AI-powered merging** — merge features between branches with a multi-agent system that handles the technical complexity
- **Auto-generated context** — every branch gets AI-generated descriptions and structured summaries so the tree stays navigable

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/fiof25/collab-studio.git
cd collab-studio

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env — set AI_PROVIDER (claude or gemini) and the matching API key.
# Without a valid API key the app runs in mock mode — AI features return sample data.

# Start development server
npm run dev
```

This starts both the Vite frontend (http://localhost:5173) and the Express backend (http://localhost:3001).

### Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start both frontend + backend (development) |
| `npm run build` | TypeScript check + Vite production build |
| `npm run preview` | Preview production build |
| `npm run server` | Start backend only |
| `npm test` | Run tests (Vitest) |

## Project Structure

```
src/
├── pages/          # 3 route pages (Home, Canvas, Editor)
├── components/
│   ├── canvas/     # Canvas screen (branch tree, merge modal)
│   ├── ide/        # Editor screen (chat, preview, blueprint)
│   └── shared/     # Reusable UI components
├── store/          # Zustand state management
├── hooks/          # Custom React hooks
├── types/          # TypeScript type definitions
└── utils/          # Utility functions

server/
├── server.js       # Express entry point
├── agents/         # AI agents (blueprint, snapshot, scout, merge)
├── routes/         # API routes
└── middleware/     # Rate limiting
```

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Vite, Zustand, React Flow
- **Backend:** Express 5, Anthropic SDK / Google Generative AI
- **AI:** Configurable provider — Claude (default) or Gemini — set via `AI_PROVIDER` env var
- **Testing:** Vitest, React Testing Library

## Documentation

See the `docs/` folder for detailed documentation:

- [`docs/product.md`](docs/product.md) — screens, user flows, core concepts
- [`docs/architecture.md`](docs/architecture.md) — stores, components, hooks, data flow
- [`docs/ai-system.md`](docs/ai-system.md) — auto-naming, blueprints, AI pipeline
- [`docs/merge-system.md`](docs/merge-system.md) — multi-agent merge architecture

## Environment

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `AI_PROVIDER` | No | `claude` | AI provider to use: `claude` or `gemini` |
| `ANTHROPIC_API_KEY` | When `AI_PROVIDER=claude` | — | Claude API key. Without it, mock mode activates. |
| `GEMINI_API_KEY` | When `AI_PROVIDER=gemini` | — | Gemini API key. Without it, mock mode activates. |

## License

Private
