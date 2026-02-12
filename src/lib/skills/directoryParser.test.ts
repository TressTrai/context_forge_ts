import { describe, it, expect } from "vitest"
import { parseSkillDirectory } from "./directoryParser"

const VALID_SKILL_MD = `---
name: Test Skill
description: A test skill for unit tests
---

## Instructions

Do the thing.`

describe("parseSkillDirectory", () => {
  it("parses skill with no references", () => {
    const files = new Map([["SKILL.md", VALID_SKILL_MD]])
    const result = parseSkillDirectory(files)

    expect(result.skill.metadata.skillName).toBe("Test Skill")
    expect(result.skill.content).toContain("Do the thing.")
    expect(result.references).toHaveLength(0)
  })

  it("parses skill with root-level references (defaults to STABLE)", () => {
    const files = new Map([
      ["SKILL.md", VALID_SKILL_MD],
      ["references/persona.md", "# Persona\nBe helpful."],
      ["references/style-guide.md", "# Style\nUse markdown."],
    ])
    const result = parseSkillDirectory(files)

    expect(result.references).toHaveLength(2)
    expect(result.references[0].filename).toBe("persona.md")
    expect(result.references[0].zone).toBe("STABLE")
    expect(result.references[0].content).toBe("# Persona\nBe helpful.")
    expect(result.references[1].filename).toBe("style-guide.md")
    expect(result.references[1].zone).toBe("STABLE")
  })

  it("maps permanent subfolder to PERMANENT zone", () => {
    const files = new Map([
      ["SKILL.md", VALID_SKILL_MD],
      ["references/permanent/core-rules.md", "# Rules"],
    ])
    const result = parseSkillDirectory(files)

    expect(result.references).toHaveLength(1)
    expect(result.references[0].zone).toBe("PERMANENT")
    expect(result.references[0].filename).toBe("core-rules.md")
  })

  it("maps working subfolder to WORKING zone", () => {
    const files = new Map([
      ["SKILL.md", VALID_SKILL_MD],
      ["references/working/draft.md", "# Draft"],
    ])
    const result = parseSkillDirectory(files)

    expect(result.references).toHaveLength(1)
    expect(result.references[0].zone).toBe("WORKING")
  })

  it("maps stable subfolder to STABLE zone", () => {
    const files = new Map([
      ["SKILL.md", VALID_SKILL_MD],
      ["references/stable/data.md", "# Data"],
    ])
    const result = parseSkillDirectory(files)

    expect(result.references).toHaveLength(1)
    expect(result.references[0].zone).toBe("STABLE")
  })

  it("maps unknown subfolders to STABLE (default)", () => {
    const files = new Map([
      ["SKILL.md", VALID_SKILL_MD],
      ["references/supplements/extra.md", "# Extra"],
      ["references/chapters/ch1.md", "# Chapter 1"],
    ])
    const result = parseSkillDirectory(files)

    expect(result.references).toHaveLength(2)
    expect(result.references[0].zone).toBe("STABLE")
    expect(result.references[1].zone).toBe("STABLE")
  })

  it("ignores non-.md files in references", () => {
    const files = new Map([
      ["SKILL.md", VALID_SKILL_MD],
      ["references/data.json", '{"key": "value"}'],
      ["references/image.png", "binary-data"],
      ["references/readme.md", "# Readme"],
    ])
    const result = parseSkillDirectory(files)

    expect(result.references).toHaveLength(1)
    expect(result.references[0].filename).toBe("readme.md")
  })

  it("handles mixed zone subfolders", () => {
    const files = new Map([
      ["SKILL.md", VALID_SKILL_MD],
      ["references/permanent/rules.md", "Rules"],
      ["references/persona.md", "Persona"],
      ["references/working/notes.md", "Notes"],
    ])
    const result = parseSkillDirectory(files)

    expect(result.references).toHaveLength(3)
    // Sorted by relativePath
    expect(result.references[0].relativePath).toBe("references/permanent/rules.md")
    expect(result.references[0].zone).toBe("PERMANENT")
    expect(result.references[1].relativePath).toBe("references/persona.md")
    expect(result.references[1].zone).toBe("STABLE")
    expect(result.references[2].relativePath).toBe("references/working/notes.md")
    expect(result.references[2].zone).toBe("WORKING")
  })

  it("throws when SKILL.md is missing", () => {
    const files = new Map([
      ["references/persona.md", "# Persona"],
    ])
    expect(() => parseSkillDirectory(files)).toThrow("No SKILL.md found")
  })

  it("preserves relative paths", () => {
    const files = new Map([
      ["SKILL.md", VALID_SKILL_MD],
      ["references/permanent/deep/nested/file.md", "# Deep"],
    ])
    const result = parseSkillDirectory(files)

    expect(result.references[0].relativePath).toBe(
      "references/permanent/deep/nested/file.md"
    )
    expect(result.references[0].zone).toBe("PERMANENT")
    expect(result.references[0].filename).toBe("file.md")
  })

  it("uses fallback name for skill description", () => {
    const skillNoDesc = `---
name: Minimal
---

Body.`
    const files = new Map([["SKILL.md", skillNoDesc]])
    const result = parseSkillDirectory(files, "my-skill-folder")

    expect(result.skill.metadata.skillDescription).toBe("my-skill-folder")
  })

  it("zone mapping is case-insensitive for folder names", () => {
    const files = new Map([
      ["SKILL.md", VALID_SKILL_MD],
      ["references/PERMANENT/upper.md", "Upper"],
      ["references/Working/mixed.md", "Mixed"],
    ])
    const result = parseSkillDirectory(files)

    expect(result.references[0].zone).toBe("PERMANENT")
    expect(result.references[1].zone).toBe("WORKING")
  })

  it("does not treat SKILL.md inside references as the main skill", () => {
    const files = new Map([
      ["SKILL.md", VALID_SKILL_MD],
      ["references/SKILL.md", "# Some other file named SKILL.md"],
    ])
    const result = parseSkillDirectory(files)

    expect(result.skill.metadata.skillName).toBe("Test Skill")
    // The references/SKILL.md is excluded because the filename filter
    // checks for references/ prefix, and it ends with .md, so it IS included as a reference
    expect(result.references).toHaveLength(1)
    expect(result.references[0].filename).toBe("SKILL.md")
  })
})
