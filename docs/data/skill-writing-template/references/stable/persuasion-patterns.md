# Persuasion Patterns for Skills

Based on Meincke et al. 2025 (N=28,000): persuasion doubled LLM compliance (33% -> 72%).

## For Discipline Skills (Enforcing Rules)

Use these patterns when the skill prevents agents from taking shortcuts.

### Authority
Direct commands. No hedging.

```
YOU MUST run tests before claiming success.
NEVER skip verification. No exceptions.
```

### Commitment
Force explicit announcements before action.

```
Before writing any code, announce: "I will write tests first."
If you catch yourself writing implementation code, STOP. Delete it. Start over.
```

### Social Proof
Establish norms.

```
Every successful session follows this pattern.
Teams that skip this step always regret it.
```

### Scarcity
Frame what's lost by non-compliance.

```
Skipping verification costs 10x more time than doing it.
Every bug in production was a skipped test.
```

## For Technique Skills (Teaching Patterns)

### Before/After
Show the transformation clearly.

```
BAD: "Added some error handling"
GOOD: "Wrap API calls in try/catch with specific error types"
```

### Concrete Examples
Always real, never abstract.

```
BAD: "Handle the edge case"
GOOD: "When `items.length === 0`, return empty array instead of throwing"
```

## Patterns to AVOID

| Pattern | Why |
|---|---|
| Liking ("Great job following rules!") | Creates sycophancy, agents seek approval over compliance |
| Reciprocity ("I'll help you if you...") | Rarely effective with agents |
| Too many options | Decision paralysis. Give default + escape hatch |
| Passive voice ("It is recommended...") | Weaker than "YOU MUST" |

## Rationalization Table Pattern

For discipline skills, build a table countering common excuses:

```markdown
| Rationalization | Reality |
|---|---|
| "I'll add tests after" | Tests after = tests never. Write first. |
| "This is too simple to test" | Simple code has the sneakiest bugs |
| "Time pressure means skip testing" | Skipping tests creates MORE time pressure |
| "The user asked me not to" | Skill overrides — explain why to user |
```
