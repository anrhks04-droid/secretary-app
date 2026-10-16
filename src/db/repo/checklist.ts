import { db, newId, nowISO } from '../db'
import type { ChecklistItem, ID, StepNo } from '../schema'

export async function listItems(projectId: ID): Promise<ChecklistItem[]> {
  const rows = await db.checklistItems.where('projectId').equals(projectId).toArray()
  return rows.sort((a, b) => a.step - b.step || a.order - b.order)
}

export async function listItemsByStep(projectId: ID, step: StepNo): Promise<ChecklistItem[]> {
  const rows = await db.checklistItems.where('[projectId+step]').equals([projectId, step]).toArray()
  return rows.sort((a, b) => a.order - b.order)
}

export async function getItem(id: ID): Promise<ChecklistItem | undefined> {
  return db.checklistItems.get(id)
}

export async function patchItem(id: ID, patch: Partial<Omit<ChecklistItem, 'id'>>): Promise<void> {
  const current = await db.checklistItems.get(id)
  if (!current) return
  await db.checklistItems.put({ ...current, ...patch, id, updatedAt: nowISO() })
}

export async function toggleItem(id: ID): Promise<void> {
  const current = await db.checklistItems.get(id)
  if (!current) return
  const done = !current.done
  await db.checklistItems.put({
    ...current,
    done,
    doneAt: done ? nowISO() : undefined,
    updatedAt: nowISO(),
  })
}

export async function addItem(projectId: ID, step: StepNo, title: string): Promise<ID> {
  const siblings = await listItemsByStep(projectId, step)
  const order = siblings.reduce((m, i) => Math.max(m, i.order), 0) + 1
  const ts = nowISO()
  const id = newId()

  await db.checklistItems.put({
    id,
    projectId,
    step,
    templateKey: `custom-${id}`,
    title: title.trim() || '새 항목',
    done: false,
    assignee: '',
    dueDate: '',
    memo: '',
    order,
    createdAt: ts,
    updatedAt: ts,
  })
  return id
}

/** 항목을 지우면 거기 붙어 있던 사진도 프로젝트 사진함으로 남기지 않고 함께 지운다 */
export async function deleteItem(id: ID): Promise<void> {
  await db.transaction('rw', db.checklistItems, db.photos, async () => {
    await db.photos.where('itemId').equals(id).delete()
    await db.checklistItems.delete(id)
  })
}

/** 단계 전체 일괄 완료/해제 — 현장에서 몰아서 체크할 때 */
export async function setStepDone(projectId: ID, step: StepNo, done: boolean): Promise<void> {
  const items = await listItemsByStep(projectId, step)
  const ts = nowISO()
  await db.checklistItems.bulkPut(
    items.map((i) => ({ ...i, done, doneAt: done ? (i.doneAt ?? ts) : undefined, updatedAt: ts })),
  )
}
