# Validation

Validation is a way to evaluate session artifacts against a set of predefined criteria using the LLM. It reuses the Brainstorm panel — criteria are defined as blocks, and the **Validate** button sends them to the LLM alongside the rest of the session context.

## How it works

1. Add one or more blocks of type **Criteria** to the session (default zone: STABLE)
2. Write or generate your artifacts via Brainstorm as usual
3. Click **Validate** in the Brainstorm panel (next to the Settings button)
4. The LLM evaluates the artifacts against the criteria and returns a structured verdict
5. If useful, save the response as a block using the existing "Save as block" button

## The Criteria block type

`criteria` is a dedicated block type for validation checklists.

| Property | Value |
|---|---|
| Default zone | STABLE |
| Color | Orange |
| Icon | CheckSquare |

**Key behavior:** Criteria blocks are **excluded** from normal Brainstorm context. This prevents the LLM from unconsciously writing to satisfy the criteria instead of responding freely. They are only included when Validate is triggered.

This means you can keep criteria blocks in the session permanently without them affecting brainstorm quality.

## Validate button

Located in the Brainstorm panel toolbar, next to the Settings button.

- **Disabled** when no Criteria blocks exist in the session (tooltip explains why)
- If the input field has text when Validate is clicked, that text is sent as the user message
- If the input field is empty, a default prompt is used: `"Validate the artifacts against the criteria."`
- The response appears in the Brainstorm conversation like any other message and can be saved as a block

## Validation system prompt suffix

When Validate is triggered, the following suffix is appended to the system prompt:

```
VALIDATION MODE: Evaluate the artifacts in this session against the criteria blocks included above.
For each criterion — state PASS, PARTIAL, or FAIL with specific quotes from the artifacts.
End with an overall verdict.
```

This instructs the LLM to produce a structured per-criterion evaluation rather than a free-form response.

## Using criteria in workflow templates

Criteria blocks can be included in workflow step templates. When a session is created from a template, the criteria blocks are carried into the session automatically — ready to validate the step's output without any manual setup.

**Example** — workflow step "Write IRD", template includes STABLE blocks:
- (reference) EARS syntax reference card
- (reference) IRD document template
- **(criteria)** All requirements use EARS syntax
- **(criteria)** Requirements are grouped by user goal, not system component
- **(criteria)** Mobile-specific requirements are included

The user writes the IRD via Brainstorm without seeing the criteria. When ready, clicks Validate — the LLM checks each criterion and reports PASS / PARTIAL / FAIL.

## Provider support

Validation works across all three supported providers: **Claude**, **Ollama**, and **OpenRouter**. The validation suffix is applied to the system prompt in all cases.

## What validation is NOT

- Not a blocking gate — always advisory, never prevents advancing to the next step
- Not persisted as a separate log — the verdict lives in the Brainstorm conversation history
- Not automated — always manually triggered by the user
