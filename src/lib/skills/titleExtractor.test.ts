import { describe, it, expect } from "vitest"
import {
  extractBlockTitle,
  sanitizeFilename,
  uniqueFilename,
} from "./titleExtractor"

describe("extractBlockTitle", () => {
  it("extracts first markdown heading", () => {
    const content = "Some preamble\n# My Title\nBody text"
    expect(extractBlockTitle(content, "reference", 0)).toBe("My Title")
  })

  it("extracts h2 heading", () => {
    const content = "## Design Notes\nDetails here"
    expect(extractBlockTitle(content, "reference", 0)).toBe("Design Notes")
  })

  it("uses first non-empty line when no heading", () => {
    const content = "This is a plain text block\nSecond line"
    expect(extractBlockTitle(content, "reference", 0)).toBe(
      "This is a plain text block"
    )
  })

  it("truncates long first lines", () => {
    const content = "A".repeat(100)
    expect(extractBlockTitle(content, "reference", 0)).toHaveLength(60)
  })

  it("falls back to type-index for empty content", () => {
    expect(extractBlockTitle("", "reference", 3)).toBe("reference-3")
  })

  it("falls back to type-index for whitespace-only content", () => {
    expect(extractBlockTitle("   \n  \n  ", "skill", 0)).toBe("skill-0")
  })

  it("skips empty lines to find first content", () => {
    const content = "\n\n\nActual content here"
    expect(extractBlockTitle(content, "reference", 0)).toBe(
      "Actual content here"
    )
  })

  it("prefers heading over first line", () => {
    const content = "First line text\n# The Heading\nMore text"
    expect(extractBlockTitle(content, "reference", 0)).toBe("The Heading")
  })
})

describe("sanitizeFilename", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(sanitizeFilename("My Design Notes")).toBe("my-design-notes")
  })

  it("strips special characters", () => {
    expect(sanitizeFilename("Hello, World! (v2)")).toBe("hello-world-v2")
  })

  it("collapses multiple hyphens", () => {
    expect(sanitizeFilename("foo---bar")).toBe("foo-bar")
  })

  it("strips leading/trailing hyphens", () => {
    expect(sanitizeFilename("--foo--")).toBe("foo")
  })

  it("truncates to 50 characters", () => {
    const long = "a".repeat(100)
    expect(sanitizeFilename(long)).toHaveLength(50)
  })

  it("returns 'untitled' for empty input", () => {
    expect(sanitizeFilename("")).toBe("untitled")
  })

  it("returns 'untitled' for special-chars-only input", () => {
    expect(sanitizeFilename("!!!@@@###")).toBe("untitled")
  })

  it("preserves underscores", () => {
    expect(sanitizeFilename("my_file_name")).toBe("my_file_name")
  })
})

describe("uniqueFilename", () => {
  it("returns base filename when no collision", () => {
    const existing = new Set<string>()
    expect(uniqueFilename("design-notes", ".md", existing)).toBe(
      "design-notes.md"
    )
  })

  it("appends -1 on first collision", () => {
    const existing = new Set(["design-notes.md"])
    expect(uniqueFilename("design-notes", ".md", existing)).toBe(
      "design-notes-1.md"
    )
  })

  it("increments suffix for multiple collisions", () => {
    const existing = new Set([
      "design-notes.md",
      "design-notes-1.md",
      "design-notes-2.md",
    ])
    expect(uniqueFilename("design-notes", ".md", existing)).toBe(
      "design-notes-3.md"
    )
  })
})
