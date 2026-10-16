import { BOM_GROUP_META, type BomGroup, type BomLine, type CostSettings, type ID } from '../schema'
import { db, newId } from '../db'

export async function listBomLines(projectId: ID): Promise<BomLine[]> {
  const rows = await db.bomLines.where('projectId').equals(projectId).toArray()
  return rows.sort((a, b) => a.order - b.order)
}

export async function addBomLine(projectId: ID, group: BomGroup): Promise<ID> {
  const siblings = await listBomLines(projectId)
  const order = siblings.reduce((m, l) => Math.max(m, l.order), 0) + 1
  const id = newId()

  await db.bomLines.put({
    id,
    projectId,
    group,
    name: '',
    spec: '',
    qty: 1,
    unit: BOM_GROUP_META[group].defaultUnit,
    unitPrice: 0,
    note: '',
    order,
  })
  return id
}

export async function patchBomLine(id: ID, patch: Partial<Omit<BomLine, 'id'>>): Promise<void> {
  const current = await db.bomLines.get(id)
  if (!current) return
  await db.bomLines.put({ ...current, ...patch, id })
}

export async function deleteBomLine(id: ID): Promise<void> {
  await db.bomLines.delete(id)
}

/* ───────────────────────── 원가 설정 ───────────────────────── */

export const DEFAULT_COST_SETTINGS: Omit<CostSettings, 'projectId'> = {
  lossRatePct: 3,
  vatMode: 'included',
}

export async function getCostSettings(projectId: ID): Promise<CostSettings> {
  return (await db.costSettings.get(projectId)) ?? { projectId, ...DEFAULT_COST_SETTINGS }
}

export async function patchCostSettings(
  projectId: ID,
  patch: Partial<Omit<CostSettings, 'projectId'>>,
): Promise<void> {
  const current = await getCostSettings(projectId)
  await db.costSettings.put({ ...current, ...patch, projectId })
}
