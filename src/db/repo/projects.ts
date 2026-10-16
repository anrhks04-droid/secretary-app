import { CHECKLIST_TEMPLATE } from '@/data/checklistTemplate'
import { DEFAULT_INVENTORY } from '@/domain/inventory'
import { DEFAULT_LABEL } from '@/domain/label'
import { db, newId, nowISO } from '../db'
import { ALL_STEPS, type ChecklistItem, type ID, type Project, type ProjectStatus } from '../schema'
import { setCurrentProject } from './settings'

export interface NewProjectInput {
  name: string
  category?: string
  sizeSpec?: string
  targetLaunchDate?: string
  memo?: string
}

export async function listProjects(): Promise<Project[]> {
  const rows = await db.projects.toArray()
  // 종료된 프로젝트는 뒤로, 그 안에서는 최근 수정 순
  const rank: Record<ProjectStatus, number> = { production: 0, planning: 1, selling: 2, archived: 3 }
  return rows.sort((a, b) => rank[a.status] - rank[b.status] || b.updatedAt.localeCompare(a.updatedAt))
}

export async function getProject(id: ID): Promise<Project | undefined> {
  return db.projects.get(id)
}

/**
 * 프로젝트를 만들면서 6단계 체크리스트와 각 도구의 기본값을 함께 깐다.
 * 하나의 트랜잭션으로 묶어, 중간에 실패해도 반쪽짜리 프로젝트가 남지 않게 한다.
 */
export async function createProject(input: NewProjectInput): Promise<ID> {
  const id = newId()
  const ts = nowISO()

  const project: Project = {
    id,
    name: input.name.trim() || '새 프로젝트',
    category: input.category?.trim() ?? '',
    sizeSpec: input.sizeSpec?.trim() ?? '',
    targetLaunchDate: input.targetLaunchDate ?? '',
    status: 'planning',
    memo: input.memo?.trim() ?? '',
    createdAt: ts,
    updatedAt: ts,
  }

  const items: ChecklistItem[] = []
  let order = 0
  for (const step of ALL_STEPS) {
    for (const t of CHECKLIST_TEMPLATE[step]) {
      items.push({
        id: newId(),
        projectId: id,
        step,
        templateKey: t.key,
        title: t.title,
        hint: t.hint,
        done: false,
        assignee: '',
        dueDate: '',
        memo: '',
        order: order++,
        toolKey: t.toolKey,
        createdAt: ts,
        updatedAt: ts,
      })
    }
  }

  await db.transaction(
    'rw',
    [db.projects, db.checklistItems, db.costSettings, db.pricingScenarios, db.inventoryParams, db.labelSpecs, db.settings],
    async () => {
      await db.projects.put(project)
      await db.checklistItems.bulkPut(items)
      await db.costSettings.put({ projectId: id, lossRatePct: 3, vatMode: 'included' })
      await db.pricingScenarios.put({
        projectId: id,
        sellingPrice: 0,
        shippingChargedToCustomer: 0,
        shippingActualCost: 3000,
        otherVariablePerUnit: 0,
        enabledChannelIds: [],
        overrides: {},
      })
      await db.inventoryParams.put({ projectId: id, ...DEFAULT_INVENTORY })
      await db.labelSpecs.put({
        projectId: id,
        ...DEFAULT_LABEL,
        productName: project.name,
        size: project.sizeSpec,
      })
    },
  )

  await setCurrentProject(id)
  return id
}

export async function patchProject(id: ID, patch: Partial<Omit<Project, 'id'>>): Promise<void> {
  const current = await db.projects.get(id)
  if (!current) return
  await db.projects.put({ ...current, ...patch, id, updatedAt: nowISO() })
}

/** 프로젝트와 거기 딸린 모든 데이터(체크리스트·사진·BOM·설정)를 지운다 */
export async function deleteProject(id: ID): Promise<void> {
  await db.transaction(
    'rw',
    [db.projects, db.checklistItems, db.photos, db.bomLines, db.costSettings, db.pricingScenarios, db.inventoryParams, db.labelSpecs, db.settings],
    async () => {
      await db.checklistItems.where('projectId').equals(id).delete()
      await db.photos.where('projectId').equals(id).delete()
      await db.bomLines.where('projectId').equals(id).delete()
      await db.costSettings.delete(id)
      await db.pricingScenarios.delete(id)
      await db.inventoryParams.delete(id)
      await db.labelSpecs.delete(id)
      await db.projects.delete(id)
    },
  )

  const settings = await db.settings.get('app')
  if (settings?.currentProjectId === id) {
    const next = await db.projects.toCollection().first()
    await setCurrentProject(next?.id)
  }
}

/** 기존 프로젝트를 복제 (체크리스트는 미완료 상태로, BOM·요율은 그대로) */
export async function duplicateProject(sourceId: ID, name: string): Promise<ID | null> {
  const source = await db.projects.get(sourceId)
  if (!source) return null

  const id = newId()
  const ts = nowISO()

  const [items, bom, cost, pricing, inv, label] = await Promise.all([
    db.checklistItems.where('projectId').equals(sourceId).toArray(),
    db.bomLines.where('projectId').equals(sourceId).toArray(),
    db.costSettings.get(sourceId),
    db.pricingScenarios.get(sourceId),
    db.inventoryParams.get(sourceId),
    db.labelSpecs.get(sourceId),
  ])

  await db.transaction(
    'rw',
    [db.projects, db.checklistItems, db.bomLines, db.costSettings, db.pricingScenarios, db.inventoryParams, db.labelSpecs, db.settings],
    async () => {
      await db.projects.put({
        ...source,
        id,
        name,
        status: 'planning',
        coverPhotoId: undefined,
        createdAt: ts,
        updatedAt: ts,
      })
      await db.checklistItems.bulkPut(
        items.map((i) => ({
          ...i,
          id: newId(),
          projectId: id,
          done: false,
          doneAt: undefined,
          memo: '',
          createdAt: ts,
          updatedAt: ts,
        })),
      )
      await db.bomLines.bulkPut(bom.map((b) => ({ ...b, id: newId(), projectId: id })))
      if (cost) await db.costSettings.put({ ...cost, projectId: id })
      if (pricing) await db.pricingScenarios.put({ ...pricing, projectId: id })
      if (inv) await db.inventoryParams.put({ ...inv, projectId: id })
      if (label) await db.labelSpecs.put({ ...label, projectId: id })
    },
  )

  await setCurrentProject(id)
  return id
}
