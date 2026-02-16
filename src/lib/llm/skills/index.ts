/**
 * Ephemeral skills registry.
 *
 * Skills are visible but ephemeral context injections for brainstorm.
 * They appear in the UI, can be toggled, but are never persisted as blocks.
 */

import {
  BRAINSTORMING_SKILL_ID,
  BRAINSTORMING_SKILL_LABEL,
  BRAINSTORMING_SKILL_CONTENT,
} from "./brainstorming"

export interface SkillDefinition {
  id: string
  label: string
  content: string
}

export const SKILLS: Record<string, SkillDefinition> = {
  [BRAINSTORMING_SKILL_ID]: {
    id: BRAINSTORMING_SKILL_ID,
    label: BRAINSTORMING_SKILL_LABEL,
    content: BRAINSTORMING_SKILL_CONTENT,
  },
}

export const DEFAULT_ACTIVE_SKILLS: Record<string, boolean> = {
  [BRAINSTORMING_SKILL_ID]: true,
}

/**
 * Get the content for all active skills, formatted for injection.
 */
export function getActiveSkillsContent(activeSkills: Record<string, boolean>): string {
  const parts: string[] = []
  for (const [id, enabled] of Object.entries(activeSkills)) {
    if (enabled && SKILLS[id]) {
      parts.push(`[Active Skill: ${SKILLS[id].label}]\n${SKILLS[id].content}`)
    }
  }
  return parts.join("\n\n")
}
