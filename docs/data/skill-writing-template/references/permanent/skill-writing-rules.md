# Skill Writing Rules

These rules are always active when writing or reviewing skills.

## Iron Law

NO SKILL WITHOUT A FAILING TEST FIRST. No exceptions. No batching. Each skill must have documented baseline failures before any content is written.

## Frontmatter

- `name`: letters, numbers, hyphens only. Max 64 characters.
- `description`: starts with "Use when...", third person, max 1024 characters.
- Description must describe WHEN to trigger, NEVER summarize workflow.
- Only `name` and `description` in frontmatter. No other fields.

## Content Rules

- SKILL.md under 500 lines.
- No narrative storytelling. Direct, imperative voice.
- Flowcharts ONLY when decision is non-obvious.
- Reference files for content over 100 lines.
- One skill per SKILL.md.
- Flat directory structure, one level deep.

## Testing Requirements

- 3+ pressure scenarios per skill.
- Each scenario combines 3+ pressures (time, sunk cost, authority, exhaustion, economics).
- Concrete A/B/C choices — not open-ended questions.
- Real file paths and real consequences.
- Document agent rationalizations verbatim.

## Quality Gates

Before a skill is ready:
- [ ] RED: Baseline failures documented with exact quotes
- [ ] GREEN: Skill addresses only observed failures
- [ ] GREEN: Agent complies under same scenarios with skill
- [ ] REFACTOR: New rationalizations countered explicitly
- [ ] REFACTOR: Meta-test passed ("How could this be clearer?")
- [ ] Frontmatter validates (name format, description format, lengths)
- [ ] Token budget met (< 500 words standard, < 200 frequent, < 150 getting-started)
