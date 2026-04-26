# Evaluation Rubric: Aegis Nexus

## 1. Design Quality (30%)
- [ ] **Aesthetic Consistency**: Mica/Glass-morphism is applied across all components. Colors follow the Indigo/Deep Space theme.
- [ ] **UI Density**: Information is dense but not cluttered. Card layout is professional and aligns with "Precision Engineering" vision.
- [ ] **Animations**: Micro-interactions (hover, click, loading) are smooth and provide clear feedback.
- [ ] **No AI Slop**: Avoids generic gradients, stock AI illustrations, or unstyled generic components.

## 2. Originality & Intelligence (20%)
- [ ] **Agent 협調 Model**: The UI clearly shows different agents (`Curator`, `Discovery`, etc.) working in the background.
- [ ] **AI Reasoning**: "Why" this news was selected is explained to the user via UI tooltips or overlays.
- [ ] **Interaction**: Features like Knowledge Graph or Command Palette provide a unique way to manage intelligence.

## 3. Engineering Craft (30%)
- [ ] **TypeScript Excellence**: Strict typing, no `any`, interfaces are well-defined.
- [ ] **Zero Warnings**: No compiler or linter warnings in the final output.
- [ ] **Architecture**: Clear separation between Agent logic (Backend) and UI State (Frontend).
- [ ] **Performance**: Fast loading, efficient state updates, no unnecessary re-renders.

## 4. Functionality & UX (20%)
- [ ] **Draft Workflow**: User can edit settings in a "Draft" state and sync them atomically.
- [ ] **E2E Stability**: Playwright tests cover:
    1. Initial loading of the dashboard.
    2. Editing an interest in the Unified Editor.
    3. Applying an AI proposal to the draft.
    4. Successful synchronization to the backend.
- [ ] **Error Handling**: Graceful degradation when Gemini API is unavailable or RSS feeds fail.

## Scoring Scale
- **0.0 - 0.4**: Non-functional or significantly diverges from spec.
- **0.5 - 0.7**: Functional but lacks polish or specific design direction.
- **0.8 - 0.9**: High quality, meets all "Must-Have" and most "Should-Have" features.
- **1.0**: Exceptional work, exceeds expectations with "Nice-to-Have" features and perfect craft.
