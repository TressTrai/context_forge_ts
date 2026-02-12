import { describe, it, expect } from "vitest"
import { parseContextMap, ContextMapParseError } from "./contextMapParser"

const files = new Set([
  "references/persona.md",
  "references/style-guide.md",
  "references/s1-aesthetic.md",
  "references/s2-dimensions.md",
  "references/output-template.md",
  "derivation/L0-context.md",
  "derivation/L1-aesthetic.md",
])

describe("parseContextMap", () => {
  it("parses a single-context map", () => {
    const yaml = `
contexts:
  step1:
    label: "First Step"
    permanent:
      - references/persona.md
    stable:
      - references/style-guide.md
`
    const result = parseContextMap(yaml, files)
    expect(result.contexts).toHaveLength(1)
    expect(result.contexts[0].key).toBe("step1")
    expect(result.contexts[0].label).toBe("First Step")
    expect(result.contexts[0].permanent).toEqual(["references/persona.md"])
    expect(result.contexts[0].stable).toEqual(["references/style-guide.md"])
    expect(result.contexts[0].working).toEqual([])
    expect(result.contexts[0].dependsOn).toEqual([])
  })

  it("parses multi-context map with dependencies", () => {
    const yaml = `
contexts:
  L0:
    label: "Level 0"
    permanent:
      - references/persona.md
    stable:
      - references/s1-aesthetic.md
    output: derivation/L0-context.md
  L1:
    label: "Level 1"
    permanent:
      - references/persona.md
    stable:
      - references/s2-dimensions.md
    working:
      - derivation/L0-context.md
    depends_on: [L0]
    output: derivation/L1-aesthetic.md
`
    const result = parseContextMap(yaml, files)
    expect(result.contexts).toHaveLength(2)
    expect(result.contexts[0].key).toBe("L0")
    expect(result.contexts[1].key).toBe("L1")
    expect(result.contexts[1].dependsOn).toEqual(["L0"])
    expect(result.contexts[1].working).toEqual(["derivation/L0-context.md"])
    expect(result.contexts[0].output).toBe("derivation/L0-context.md")
  })

  it("topologically sorts contexts regardless of definition order", () => {
    const yaml = `
contexts:
  C:
    label: "Step C"
    depends_on: [B]
    stable:
      - references/style-guide.md
  A:
    label: "Step A"
    stable:
      - references/persona.md
  B:
    label: "Step B"
    depends_on: [A]
    stable:
      - references/s1-aesthetic.md
`
    const result = parseContextMap(yaml, files)
    const keys = result.contexts.map((c) => c.key)
    expect(keys).toEqual(["A", "B", "C"])
  })

  it("detects circular dependencies", () => {
    const yaml = `
contexts:
  A:
    label: "Step A"
    depends_on: [B]
    stable:
      - references/persona.md
  B:
    label: "Step B"
    depends_on: [A]
    stable:
      - references/style-guide.md
`
    expect(() => parseContextMap(yaml, files)).toThrow(ContextMapParseError)
    expect(() => parseContextMap(yaml, files)).toThrow(/Circular dependency/)
  })

  it("throws on missing referenced files", () => {
    const yaml = `
contexts:
  step1:
    label: "Step 1"
    stable:
      - references/nonexistent.md
`
    expect(() => parseContextMap(yaml, files)).toThrow(ContextMapParseError)
    expect(() => parseContextMap(yaml, files)).toThrow(/not found in package/)
  })

  it("throws on invalid YAML", () => {
    const yaml = `
contexts:
  step1:
    label: "Unclosed quote
`
    expect(() => parseContextMap(yaml, files)).toThrow(ContextMapParseError)
    expect(() => parseContextMap(yaml, files)).toThrow(/Invalid YAML/)
  })

  it("throws on missing contexts key", () => {
    const yaml = `
steps:
  step1:
    label: "Wrong key"
`
    expect(() => parseContextMap(yaml, files)).toThrow(ContextMapParseError)
    expect(() => parseContextMap(yaml, files)).toThrow(/Missing 'contexts'/)
  })

  it("throws on missing label", () => {
    const yaml = `
contexts:
  step1:
    stable:
      - references/persona.md
`
    expect(() => parseContextMap(yaml, files)).toThrow(ContextMapParseError)
    expect(() => parseContextMap(yaml, files)).toThrow(/missing required 'label'/)
  })

  it("throws on unknown depends_on reference", () => {
    const yaml = `
contexts:
  step1:
    label: "Step 1"
    depends_on: [nonexistent]
    stable:
      - references/persona.md
`
    expect(() => parseContextMap(yaml, files)).toThrow(ContextMapParseError)
    expect(() => parseContextMap(yaml, files)).toThrow(/unknown context/)
  })

  it("handles empty zone arrays", () => {
    const yaml = `
contexts:
  step1:
    label: "Empty zones"
    permanent: []
    stable: []
    working: []
`
    const result = parseContextMap(yaml, files)
    expect(result.contexts[0].permanent).toEqual([])
    expect(result.contexts[0].stable).toEqual([])
    expect(result.contexts[0].working).toEqual([])
  })

  it("handles optional_stable field", () => {
    const yaml = `
contexts:
  step1:
    label: "With optional"
    stable:
      - references/persona.md
    optional_stable:
      - references/style-guide.md
`
    const result = parseContextMap(yaml, files)
    expect(result.contexts[0].optionalStable).toEqual(["references/style-guide.md"])
  })

  it("throws on empty contexts object", () => {
    const yaml = `
contexts: {}
`
    expect(() => parseContextMap(yaml, files)).toThrow(ContextMapParseError)
    expect(() => parseContextMap(yaml, files)).toThrow(/at least one context/)
  })

  it("handles parallel dependencies (diamond shape)", () => {
    const yaml = `
contexts:
  D:
    label: "Step D"
    depends_on: [B, C]
    stable:
      - references/output-template.md
  B:
    label: "Step B"
    depends_on: [A]
    stable:
      - references/s1-aesthetic.md
  C:
    label: "Step C"
    depends_on: [A]
    stable:
      - references/s2-dimensions.md
  A:
    label: "Step A"
    stable:
      - references/persona.md
`
    const result = parseContextMap(yaml, files)
    const keys = result.contexts.map((c) => c.key)
    // A must come first, D must come last
    expect(keys[0]).toBe("A")
    expect(keys[keys.length - 1]).toBe("D")
    // B and C must come after A and before D
    expect(keys.indexOf("B")).toBeGreaterThan(keys.indexOf("A"))
    expect(keys.indexOf("C")).toBeGreaterThan(keys.indexOf("A"))
    expect(keys.indexOf("B")).toBeLessThan(keys.indexOf("D"))
    expect(keys.indexOf("C")).toBeLessThan(keys.indexOf("D"))
  })
})
