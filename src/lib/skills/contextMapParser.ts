/**
 * Parser for context-map.yaml files.
 * Validates structure, resolves dependencies, and topologically sorts contexts.
 */

import yaml from "js-yaml"

export interface ContextMapContext {
  key: string
  label: string
  permanent: string[]
  stable: string[]
  working: string[]
  optionalStable: string[]
  dependsOn: string[]
  output?: string
}

export interface ParsedContextMap {
  contexts: ContextMapContext[] // topologically sorted by depends_on
}

export class ContextMapParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ContextMapParseError"
  }
}

interface RawContextMap {
  contexts?: Record<string, RawContext>
}

interface RawContext {
  label?: string
  permanent?: string[]
  stable?: string[]
  working?: string[]
  optional_stable?: string[]
  depends_on?: string[]
  output?: string
  splits?: Record<string, unknown>
}

function toStringArray(value: unknown): string[] {
  if (!value) return []
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === "string")
}

/**
 * Parse and validate a context-map.yaml file.
 *
 * @param yamlContent Raw YAML string
 * @param availableFiles Set of file paths available in the skill package (for validation)
 * @returns ParsedContextMap with topologically sorted contexts
 * @throws ContextMapParseError on validation failures
 */
export function parseContextMap(
  yamlContent: string,
  availableFiles: Set<string>
): ParsedContextMap {
  let raw: RawContextMap
  try {
    raw = yaml.load(yamlContent) as RawContextMap
  } catch (err) {
    throw new ContextMapParseError(
      `Invalid YAML: ${err instanceof Error ? err.message : "parse error"}`
    )
  }

  if (!raw || typeof raw !== "object" || !raw.contexts) {
    throw new ContextMapParseError("Missing 'contexts' key in context-map.yaml")
  }

  if (typeof raw.contexts !== "object" || Array.isArray(raw.contexts)) {
    throw new ContextMapParseError("'contexts' must be an object mapping keys to context definitions")
  }

  const contextKeys = Object.keys(raw.contexts)
  if (contextKeys.length === 0) {
    throw new ContextMapParseError("context-map.yaml must define at least one context")
  }

  // Validate each context
  const contextMap = new Map<string, RawContext>()
  const allReferencedFiles: string[] = []

  for (const key of contextKeys) {
    const ctx = raw.contexts[key]
    if (!ctx || typeof ctx !== "object") {
      throw new ContextMapParseError(`Context '${key}' must be an object`)
    }

    if (!ctx.label || typeof ctx.label !== "string") {
      throw new ContextMapParseError(`Context '${key}' is missing required 'label' field`)
    }

    // Validate depends_on references
    const deps = toStringArray(ctx.depends_on)
    for (const dep of deps) {
      if (!raw.contexts[dep]) {
        throw new ContextMapParseError(
          `Context '${key}' depends on unknown context '${dep}'`
        )
      }
    }

    // Collect all file references
    const files = [
      ...toStringArray(ctx.permanent),
      ...toStringArray(ctx.stable),
      ...toStringArray(ctx.working),
      ...toStringArray(ctx.optional_stable),
    ]
    allReferencedFiles.push(...files)

    contextMap.set(key, ctx)
  }

  // Validate file paths exist
  for (const filePath of allReferencedFiles) {
    if (!availableFiles.has(filePath)) {
      throw new ContextMapParseError(
        `Referenced file not found in package: ${filePath}`
      )
    }
  }

  // Topological sort
  const sorted = topologicalSort(contextMap)

  return { contexts: sorted }
}

function topologicalSort(
  contexts: Map<string, RawContext>
): ContextMapContext[] {
  const sorted: ContextMapContext[] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()

  function visit(key: string) {
    if (visited.has(key)) return
    if (visiting.has(key)) {
      throw new ContextMapParseError(
        `Circular dependency detected involving context: ${key}`
      )
    }

    visiting.add(key)
    const ctx = contexts.get(key)!
    const deps = toStringArray(ctx.depends_on)

    for (const dep of deps) {
      visit(dep)
    }

    visiting.delete(key)
    visited.add(key)

    sorted.push({
      key,
      label: ctx.label!,
      permanent: toStringArray(ctx.permanent),
      stable: toStringArray(ctx.stable),
      working: toStringArray(ctx.working),
      optionalStable: toStringArray(ctx.optional_stable),
      dependsOn: deps,
      output: typeof ctx.output === "string" ? ctx.output : undefined,
    })
  }

  for (const key of contexts.keys()) {
    visit(key)
  }

  return sorted
}
