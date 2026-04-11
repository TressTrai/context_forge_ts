# Entry Questions

Entry Questions are a list of predefined questions attached to a specific workflow step. When a user enters a step — either by creating a project from a workflow or advancing to the next step — a dialog appears with these questions. The answers are saved as a single block of type `entry_brief` in the WORKING zone.

## Why this exists

A workflow describes a multi-step document creation process. Each step has its own context that is unique to a particular project — for example, the game title, target audience, or genre. Without Entry Questions, the user would have to manually add these context blocks to every new session.

Entry Questions let you define upfront what information needs to be collected at the start of a step, and automatically structure it as context.

**Example.** Workflow "Game Design Document", step 1 "Core Concept":
- What is the game title?
- What genre is this game?
- Who is the target audience?

The user fills in the answers, and the following block is added to the session:

```
**What is the game title?**
Shadow Realm

**What genre is this game?**
Action RPG

**Who is the target audience?**
18-35, fans of Dark Souls
```

## Data structure

Entry Questions are stored directly on the step object inside the workflow. Each step also has an optional `description` shown in the dialog:

```ts
// convex/schema.ts
steps: v.array(v.object({
  name: v.string(),
  description: v.optional(v.string()),          // shown in dialog header
  templateId: v.optional(v.id("templates")),
  carryForwardZones: v.optional(v.array(...)),
  entryQuestions: v.optional(v.array(v.string())),  // ← here
}))
```

## How it works

### Configuring questions

In the workflow editor (`/app/workflows/:id`), the step dialog has a field for adding questions. Questions are saved via `api.workflows.addStep` / `api.workflows.updateStep`.

### Showing the dialog

The `EntryQuestionsDialog` component (`src/components/EntryQuestionsDialog.tsx`) is triggered from four entry points:

| Entry point | Mutation | File |
|---|---|---|
| Creating a project from a workflow | `api.workflows.startProject` | `src/routes/app/projects.index.tsx` |
| Starting a workflow from the Workflows page | `api.workflows.startProject` | `src/routes/app/workflows.index.tsx` |
| Advancing to the next step from the project page | `api.workflows.advanceStep` | `src/routes/app/projects.$projectId.tsx` |
| Advancing to the next step from the main screen | `api.sessions.goToNextStep` | `src/routes/app/index.tsx` |

All mutations return `entryQuestions: string[]` and `stepDescription?: string`. If `entryQuestions` is non-empty, the dialog is shown; otherwise the session opens immediately.

### Saving answers

After the user fills in the form, all answers are combined into **a single block** in this format:

```
**Question 1**
Answer 1

**Question 2**
Answer 2
```

The block is created with type `entry_brief` in the `STABLE` zone. Questions left blank are skipped. If all questions are skipped, no block is created.

Using STABLE (not WORKING) is intentional: entry briefs are step-specific intake context, not output artifacts. Since `carryForwardZones` typically carries only `WORKING`, entry briefs stay in the step they were collected for and do not pollute the next step's context.

The user can press "Skip" to dismiss the dialog without creating a block and open the session as normal.

## EntryQuestionsDialog component

`src/components/EntryQuestionsDialog.tsx`

Props:
- `isOpen: boolean`
- `stepName: string` — displayed in the dialog header
- `stepDescription?: string` — optional step description shown below the header
- `questions: string[]` — list of questions
- `onSubmit: (answers: Record<number, string>) => Promise<void>` — answers keyed by question index
- `onSkip: () => void`

Answers are tracked by **index** (not by question text), so steps with duplicate question strings work correctly — each field has its own independent state.

Shows an answered-count indicator and "Save to Context" / "Skip" buttons.

## Marketplace

When a workflow is published to the marketplace, `entryQuestions` are included in the stored `workflowSteps` snapshot. When another user imports the workflow, their copy receives the same questions.

The full round-trip is:

| Stage | Location |
|---|---|
| Publish / Update | `api.marketplace.publish` — maps `s.entryQuestions` into `workflowSteps` |
| Import | `api.marketplace.importWorkflow` — restores `step.entryQuestions` onto each workflow step |

The `marketplace` schema (`convex/schema.ts`, `workflowSteps` array) also declares `entryQuestions: v.optional(v.array(v.string()))` so the field is stored correctly.
