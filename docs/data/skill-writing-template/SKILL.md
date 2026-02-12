---
name: skill-writing-guide
description: Use when creating new Claude Code skills or improving existing ones. Covers TDD-based skill development workflow (RED/GREEN/REFACTOR), SKILL.md structure, frontmatter rules, CSO optimization, persuasion patterns, and token budgets. Import into ContextForge and save as template.
---

# Skill Writing Guide

Write Claude Code skills using Test-Driven Development applied to documentation. Every skill must pass RED-GREEN-REFACTOR before deployment.

## Workflow: TDD for Skills

### Phase 1: RED (Baseline)

Test WITHOUT the skill first. This is mandatory — no exceptions.

1. Create 3+ pressure scenarios combining: time pressure, sunk cost, exhaustion, authority, economic constraints
2. Each scenario must have concrete A/B/C choices (force decision, not open-ended)
3. Run agent WITHOUT skill installed
4. Document failures verbatim — exact rationalizations the agent gives
5. Identify patterns in excuses

**Scenario anatomy:**
- Real file paths (not generic `/path/to/file`)
- 3+ combined pressures per scenario
- Real consequences/stakes
- "Make the decision" — not "What should you do?"

### Phase 2: GREEN (Minimal Skill)

Write SKILL.md addressing ONLY the failures from RED phase.

1. Start with YAML frontmatter (name + description)
2. Write minimal content that counters observed failures
3. Run same scenarios WITH skill installed
4. Verify agent now complies
5. If agent still fails → go to Phase 3

### Phase 3: REFACTOR (Bulletproof)

Close loopholes. Agents are creative rationalizers.

1. Identify NEW rationalizations from GREEN testing
2. Add explicit counters for each rationalization
3. Build rationalization table: "excuse → reality"
4. Create red flags list for self-checking
5. Meta-test: Ask agent "You read the skill and chose wrong. How could it be written to make the right answer crystal clear?"

**Meta-test responses reveal:**
- "Skill WAS clear, I chose to ignore it" → Need foundational principle
- "Skill should have said X" → Add their suggestion verbatim
- "I didn't see section Y" → Make key points more prominent

## SKILL.md Structure

Standard sections in order:

1. **Overview** — What + core principle (1-2 sentences)
2. **When to Use** — Symptoms, triggers, when NOT to use. Flowchart ONLY if decision non-obvious
3. **Core Pattern** — Before/after comparison (for technique skills)
4. **Quick Reference** — Table or bullets for scanning
5. **Implementation** — Inline for simple, link to file for 100+ lines
6. **Common Mistakes** — What goes wrong + fixes
7. **Real-World Impact** (optional) — Concrete results

## Frontmatter Rules

```yaml
---
name: my-skill-name    # Letters, numbers, hyphens only. Max 64 chars.
description: Use when [triggering conditions]. [Symptoms/contexts]. # Max 1024 chars. Third person. NO workflow summary.
---
```

**Description is CSO (Claude Search Optimization):**
- Starts with "Use when..." — describes WHEN to trigger, not what it does
- Third person (injected into system prompt)
- Include: error messages, symptoms, tool names as searchable keywords
- NEVER summarize workflow — Claude may follow description instead of reading full skill

## Token Budgets

| Skill type | Budget |
|---|---|
| Getting-started workflows | < 150 words |
| Frequently-loaded skills | < 200 words |
| Standard skills | < 500 words |
| With heavy reference | SKILL.md < 500, reference files separate |

Techniques: move details to reference files, use cross-references, compress examples ruthlessly.

## File Organization

**Self-contained:**
```
skill-name/
  SKILL.md
```

**With tool/script:**
```
skill-name/
  SKILL.md
  helper.ts
```

**With heavy reference:**
```
skill-name/
  SKILL.md
  reference.md
```

Rules:
- Flat namespace, one directory level
- SKILL.md under 500 lines
- Reference files for 100+ lines of content or reusable tools
- One level deep from SKILL.md

## Discipline vs. Technique Skills

**Discipline skills** enforce rules agents tend to bypass under pressure:
- Use Authority: "YOU MUST", "Never", "No exceptions"
- Use Commitment: Require announcements, force explicit choices
- Use Social Proof: "Every time", "Always"
- Build rationalization tables
- AVOID Liking (creates sycophancy)

**Technique skills** teach patterns or workflows:
- Use before/after examples
- Quick reference tables
- Flowcharts for non-obvious decisions
- Working code examples

## Anti-Patterns

- Narrative examples ("In session 2025-10-03...")
- Code in flowcharts (can't copy-paste)
- Generic labels ("helper1", "step3")
- Description summarizing workflow (dangerous — creates shortcuts)
- Deeply nested references (Claude reads partial files)
- Offering too many options (provide default + escape hatch)
- Skipping RED phase ("I know what agents do wrong")
- Multiple skills per SKILL.md
