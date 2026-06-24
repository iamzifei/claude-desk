import type { DragEvent } from 'react'
import type { SplitTarget, Favorite } from './types'

/**
 * Drag-and-drop payload helpers for the tiling work area. Three payload kinds,
 * each on its own MIME so drop zones can tell them apart:
 *   - pane target  : a sidebar module / conversation → open in a pane
 *   - pane index   : an existing pane being dragged → swap two panes
 *   - skill        : a skill being dragged into a chat → reference it
 * Pure wrappers over the native dataTransfer — no library needed.
 */
const TARGET_MIME = 'application/x-moxi-pane'
const PANEIDX_MIME = 'application/x-moxi-paneidx'
const SKILL_MIME = 'application/x-moxi-skill'

export interface SkillDrag {
  name: string
  slug: string
}

export function setDragTarget(e: DragEvent, target: SplitTarget): void {
  e.dataTransfer.setData(TARGET_MIME, JSON.stringify(target))
  e.dataTransfer.effectAllowed = 'copyMove'
}

export function getDragTarget(e: DragEvent): SplitTarget | null {
  return parse<SplitTarget>(e, TARGET_MIME)
}

export function setPaneDrag(e: DragEvent, fromIndex: number): void {
  e.dataTransfer.setData(PANEIDX_MIME, String(fromIndex))
  e.dataTransfer.effectAllowed = 'move'
}

export function getPaneDrag(e: DragEvent): number | null {
  const raw = e.dataTransfer.getData(PANEIDX_MIME)
  if (!raw) return null
  const n = Number(raw)
  return Number.isInteger(n) ? n : null
}

export function setSkillDrag(e: DragEvent, skill: SkillDrag): void {
  e.dataTransfer.setData(SKILL_MIME, JSON.stringify(skill))
  e.dataTransfer.effectAllowed = 'copy'
}

export function getSkillDrag(e: DragEvent): SkillDrag | null {
  return parse<SkillDrag>(e, SKILL_MIME)
}

/** A pane drop zone accepts both "open this target" and "swap with this pane". */
export function hasPaneDrop(e: DragEvent): boolean {
  return e.dataTransfer.types.includes(TARGET_MIME) || e.dataTransfer.types.includes(PANEIDX_MIME)
}

export function hasSkillDrag(e: DragEvent): boolean {
  return e.dataTransfer.types.includes(SKILL_MIME)
}

/** Whether a target is already pinned (identity by structural equality). */
export function isFavorited(favorites: Favorite[], t: Favorite): boolean {
  const key = JSON.stringify(t)
  return favorites.some((f) => JSON.stringify(f) === key)
}

function parse<T>(e: DragEvent, mime: string): T | null {
  const raw = e.dataTransfer.getData(mime)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
