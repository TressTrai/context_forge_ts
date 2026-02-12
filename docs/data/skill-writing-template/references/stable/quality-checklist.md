# Skill Quality Checklist

Use this checklist to validate each phase of skill development.

## RED Phase (Baseline Testing)

- [ ] Created 3+ pressure scenarios
- [ ] Each scenario has concrete A/B/C choices (not open-ended)
- [ ] Each scenario combines 3+ pressures
- [ ] Ran scenarios WITHOUT skill installed
- [ ] Documented exact failure quotes from agent
- [ ] Identified rationalization patterns across scenarios

## GREEN Phase (Minimal Skill)

### Frontmatter
- [ ] `name` uses only letters, numbers, hyphens
- [ ] `name` is under 64 characters
- [ ] `description` starts with "Use when..."
- [ ] `description` is in third person
- [ ] `description` under 1024 characters
- [ ] `description` does NOT summarize workflow
- [ ] `description` includes searchable keywords (symptoms, tool names)
- [ ] Only `name` and `description` in YAML — no extra fields

### Content
- [ ] Clear overview with core principle (1-2 sentences)
- [ ] Addresses specific baseline failures from RED phase
- [ ] Under 500 lines total
- [ ] No narrative storytelling
- [ ] No generic labels ("helper1", "step3")
- [ ] Working code examples if relevant (not in flowcharts)

### Validation
- [ ] Ran same scenarios WITH skill installed
- [ ] Agent now complies in all scenarios
- [ ] If still failing → proceed to REFACTOR

## REFACTOR Phase (Bulletproofing)

- [ ] Identified NEW rationalizations from GREEN testing
- [ ] Added explicit counters for each rationalization
- [ ] Built rationalization table (excuse → reality)
- [ ] Created red flags list for self-checking
- [ ] Meta-test: Asked "How could this be clearer?"
- [ ] Applied meta-test feedback to skill
- [ ] Re-ran all scenarios — full compliance

## Export Validation

- [ ] SKILL.md has valid YAML frontmatter
- [ ] All reference files are .md format
- [ ] Directory is flat (one level from SKILL.md)
- [ ] No files over 500 lines individually
- [ ] Total skill fits token budget for its category

## Token Budgets

| Category | Max words | When |
|---|---|---|
| Getting-started | 150 | Used at startup |
| Frequently-loaded | 200 | Loaded every session |
| Standard | 500 | Loaded on demand |
| Heavy reference | 500 + separate files | Complex domains |
