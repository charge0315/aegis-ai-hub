# Aegis Nexus - Technical Details & Engineering Specifications

**Version:** 5.4.0 Aegis Chroma  
**Target Platform:** Windows 11 (Optimized for Acrylic Glassmorphism)

This document contains deep technical specifications, architecture maps, and internal logic details for developers and contributors.

---

## 🏗️ System Architecture

Aegis Nexus uses a tightly coupled hybrid architecture consisting of an Electron frontend and an internal Fastify backend.

### 1. Hybrid Process Model
- **Electron Main Process**: Orchestrates the application lifecycle, window management, and native OS integrations (Auto-launch, Tray, Native UI).
- **Internal Fastify Server**: Hosted within the Node.js process space of the Main process. It provides a RESTful API for the frontend and background jobs.
- **Shared Singleton Manager**: Both the Fastify routes and the Main process background jobs share the same `SettingsManager` and `ScraperFacade` instances, ensuring a "Single Source of Truth."

### 2. Data Flow & Consistency
- **Zod Schema Validation**: Every data structure (Interests, FeedConfig, Articles) is strictly validated at runtime using Zod schemas defined in `src/models/Schemas.ts`.
- **Atomic Persistence**: Settings are updated atomically to `settings.json` and `feed_config.json` in the user's AppData directory.

---

## 🧠 AI Agent Framework

The core intelligence of Aegis Nexus is powered by the **Gemini 3.1 Series** (Pro & Flash), orchestrated through a specialized agent layer.

### Core Agents
- **ArchitectAgent**: Designs implementation plans and orchestrates high-level tasks.
- **CuratorAgent**: Analyzes article content against user interests to provide "Reasoning" for top selections.
- **DiscoveryAgent**: Proactively explores the web for new RSS/Atom feeds based on category context.
- **ArchivistAgent**: Extracts emerging trends and keywords from article pools to populate the `learned_keywords` buffer.

### AI Strategies
- **Structured Output**: Uses Gemini's JSON mode with strict response schemas to ensure zero-hallucination structured data.
- **Dynamic Model Switching**:
  - `gemini-3.1-pro`: Used for complex restructuring and deep context analysis.
  - `gemini-3.1-flash`: Used for lightweight summarization and discovery.
- **Resilient Fallbacks**: If AI-discovered feeds fail validation, the system automatically injects optimized Google News RSS searches as a fallback.

---

## 📂 Directory Structure

```text
aegis-ai-hub/
├── electron/          # Electron Main Process & Native OS Bridge
│   ├── main.cjs       # Entry point, Window & IPC management
│   ├── index.cjs      # Environment-aware bootstrap
│   └── preload.cjs    # Secure IPC bridge (Context Isolation)
├── src/               # Unified Application Logic
│   ├── agents/        # Autonomous AI Agent implementations
│   ├── api/           # Fastify routes & API bridge
│   ├── core/          # Central Orchestrator (NexusOrchestrator)
│   ├── services/      # Business Logic (Gemini, RSS, Scoring, Image Cache)
│   ├── components/    # React UI (Glassmorphism components)
│   ├── hooks/         # Custom React hooks (State & Sync logic)
│   ├── models/        # Zod schemas & Data models
│   ├── jobs/          # Background lifecycle jobs (EvolutionJob)
│   └── utils/         # Normalization & Utility functions
├── data/              # Default configuration and profile templates
├── docs/              # Documentation, Troubleshooting & Codemaps
└── package.json       # Unified dependency & build configuration
```

---

## 🛠️ Tech Stack

- **Framework**: Electron 41.x (with Acrylic/Blur support)
- **Frontend**: React 19, Tailwind CSS 4, Framer Motion
- **Backend**: Fastify 5.x
- **Language**: TypeScript 6.x
- **Bundler**: Vite 8 (Renderer), esbuild (Main)
- **AI Engine**: Google Gemini API (v1beta / 3.1 models)
- **Automation**: Playwright (E2E), Vitest (Unit)

---

## ⚙️ Development Workflows

### Setup
```bash
npm install
```

### Run (Development)
```bash
# Starts Vite HMR and Electron in parallel
npm run electron:dev
```

### Build (Production)
```bash
# Compiles React, bundles Electron, and packages NSIS installer
npm run dist
```

---
*For high-level project goals and features, refer to [README.md](../README.md).*
