# Contributing to Aegis Nexus

We're excited that you're interested in contributing to Aegis Nexus! This command center is built on the passion of developers who want to manage information noise using advanced AI engines. 

Please take a moment to review this document to make your contribution process smooth and successful.

---

## 🚀 How to Get Started

### Prerequisites
- **Node.js** v22.x or later
- **npm** or similar package manager
- One of the following LLM setups:
  - Google Gemini API Key
  - Anthropic API Key
  - OpenAI / Compatible API Key
  - Ollama installed and running locally

### Development Setup
1. **Fork and Clone** the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/aegis-ai-hub.git
   cd aegis-ai-hub
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start the development server**:
   ```bash
   # Run Vite frontend and Electron side-by-side with Hot Module Replacement (HMR)
   npm run electron:dev
   ```

---

## 🛠️ Project Structure

- `src/components/` - React frontend layout and views
- `src/services/` - Business logic and API integrations
- `src/services/ai/` - Multi-LLM provider abstraction layers (Google, Anthropic, OpenAI, Ollama)
- `src/models/` - Zod schemas and validation rules
- `electron/` - Desktop shell shell settings and safeStorage handling
- `tests/` - Unit tests (Vitest) and End-to-End tests (Playwright)

---

## 📋 Contribution Process

1. **Find or Open an Issue**: 
   Before sending a Pull Request, please search active Issues or open a new one to discuss your proposed changes.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-awesome-feature
   ```
3. **Write Tests & Implementation**:
   Ensure that any new service or core function has corresponding unit tests.
4. **Run Verification Tools**:
   ```bash
   # Verify lint rules
   npm run lint

   # Run Vitest suite
   npm run test
   ```
5. **Commit & Push**:
   Keep commits clean and write descriptive commit messages.
6. **Submit a Pull Request**:
   Describe what changed, how you verified it, and reference any relevant Issues.

---

## 🛡️ Coding Standards

- **TypeScript Safety**: Use strict typing. Avoid `any` wherever possible.
- **Immutability**: Avoid mutating state directly. Always use functional updates or create new copies.
- **Component-Driven UI**: Reuse components and keep them modular. Follow Windows 11 Fluent and Acrylic glassmorphism guidelines.
- **Type-only Imports**: Use `import type` when only importing types to satisfy `verbatimModuleSyntax`.

---

## 💬 Community & Code of Conduct

Aegis Nexus is open to all contributors. We expect every participant to treat others with respect and build a constructive, welcoming community.

Thank you for contributing to the future of AI Command Centers! 🛰️
