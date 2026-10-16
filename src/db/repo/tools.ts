import { DEFAULT_INVENTORY } from '@/domain/inventory'
import { DEFAULT_LABEL } from '@/domain/label'
import { db } from '../db'
import type { ID, InventoryParams, LabelSpec } from '../schema'

/* ───────────────────────── 재고·물류 계산기 ───────────────────────── */

export async function getInventory(projectId: ID): Promise<InventoryParams> {
  return (await db.inventoryParams.get(projectId)) ?? { projectId, ...DEFAULT_INVENTORY }
}

export async function patchInventory(
  projectId: ID,
  patch: Partial<Omit<InventoryParams, 'projectId'>>,
): Promise<void> {
  const current = await getInventory(projectId)
  await db.inventoryParams.put({ ...current, ...patch, projectId })
}

/* ───────────────────────── 한글표시사항 ───────────────────────── */

export async function getLabelSpec(projectId: ID): Promise<LabelSpec> {
  return (await db.labelSpecs.get(projectId)) ?? { projectId, ...DEFAULT_LABEL }
}

export async function patchLabelSpec(
  projectId: ID,
  patch: Partial<Omit<LabelSpec, 'projectId'>>,
): Promise<void> {
  const current = await getLabelSpec(projectId)
  await db.labelSpecs.put({ ...current, ...patch, projectId })
}
