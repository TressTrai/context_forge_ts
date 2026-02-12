import { describe, it, expect } from "vitest"
import { parseSkillMd, SkillParseError } from "./parser"

describe("parseSkillMd", () => {
  it("parses valid SKILL.md with name and description", () => {
    const raw = `---
name: Code Review
description: Systematic code review skill
---

## Instructions

Review the code carefully.`

    const result = parseSkillMd(raw)
    expect(result.metadata.skillName).toBe("Code Review")
    expect(result.metadata.skillDescription).toBe(
      "Systematic code review skill"
    )
    expect(result.content).toBe("## Instructions\n\nReview the code carefully.")
  })

  it("parses name-only frontmatter using fallback for description", () => {
    const raw = `---
name: My Skill
---

Body content here.`

    const result = parseSkillMd(raw, "my-skill.md")
    expect(result.metadata.skillName).toBe("My Skill")
    expect(result.metadata.skillDescription).toBe("my-skill.md")
  })

  it("uses empty string when no description and no fallback", () => {
    const raw = `---
name: Minimal Skill
---

Content.`

    const result = parseSkillMd(raw)
    expect(result.metadata.skillDescription).toBe("")
  })

  it("throws on missing frontmatter", () => {
    expect(() => parseSkillMd("Just some markdown")).toThrow(SkillParseError)
    expect(() => parseSkillMd("Just some markdown")).toThrow(
      "missing frontmatter"
    )
  })

  it("throws on missing closing delimiter", () => {
    const raw = `---
name: Broken Skill
No closing delimiter here`

    expect(() => parseSkillMd(raw)).toThrow(SkillParseError)
    expect(() => parseSkillMd(raw)).toThrow("missing closing ---")
  })

  it("throws on missing name field", () => {
    const raw = `---
description: A skill without a name
---

Content.`

    expect(() => parseSkillMd(raw)).toThrow(SkillParseError)
    expect(() => parseSkillMd(raw)).toThrow("missing required 'name'")
  })

  it("handles quoted values (double quotes)", () => {
    const raw = `---
name: "Quoted Skill"
description: "A skill with quotes"
---

Content.`

    const result = parseSkillMd(raw)
    expect(result.metadata.skillName).toBe("Quoted Skill")
    expect(result.metadata.skillDescription).toBe("A skill with quotes")
  })

  it("handles quoted values (single quotes)", () => {
    const raw = `---
name: 'Single Quoted'
description: 'Also quoted'
---

Content.`

    const result = parseSkillMd(raw)
    expect(result.metadata.skillName).toBe("Single Quoted")
    expect(result.metadata.skillDescription).toBe("Also quoted")
  })

  it("handles empty body", () => {
    const raw = `---
name: Empty Body Skill
---`

    const result = parseSkillMd(raw)
    expect(result.metadata.skillName).toBe("Empty Body Skill")
    expect(result.content).toBe("")
  })

  it("ignores extra frontmatter fields", () => {
    const raw = `---
name: Full Skill
description: With extras
version: 1.0.0
author: Test Author
tags: review, code
---

Body.`

    const result = parseSkillMd(raw)
    expect(result.metadata.skillName).toBe("Full Skill")
    expect(result.metadata.skillDescription).toBe("With extras")
    expect(result.content).toBe("Body.")
  })

  it("strips leading/trailing whitespace from body", () => {
    const raw = `---
name: Whitespace Skill
---


  Body with whitespace.

`

    const result = parseSkillMd(raw)
    expect(result.content).toBe("Body with whitespace.")
  })

  it("handles case-insensitive frontmatter keys", () => {
    const raw = `---
Name: Case Test
Description: Case insensitive
---

Content.`

    const result = parseSkillMd(raw)
    expect(result.metadata.skillName).toBe("Case Test")
    expect(result.metadata.skillDescription).toBe("Case insensitive")
  })
})
