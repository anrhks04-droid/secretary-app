import Dexie, { type Table } from 'dexie'
import type {
  AppSettings,
  BomLine,
  ChannelRate,
  ChecklistItem,
  CostSettings,
  ID,
  InventoryParams,
  LabelSpec,
  Photo,
  PricingScenario,
  Project,
} from './schema'

/**
 * IndexedDB 스키마.
 *
 * 인덱스 주의: IndexedDB는 boolean을 키로 쓸 수 없으므로 done 같은 필드는
 * 인덱싱하지 않고 메모리에서 필터한다(프로젝트당 수십 건 수준이라 충분).
 */
export class SecretaryDB extends Dexie {
  projects!: Table<Project, ID>
  checklistItems!: Table<ChecklistItem, ID>
  photos!: Table<Photo, ID>
  bomLines!: Table<BomLine, ID>
  costSettings!: Table<CostSettings, ID>
  pricingScenarios!: Table<PricingScenario, ID>
  inventoryParams!: Table<InventoryParams, ID>
  labelSpecs!: Table<LabelSpec, ID>
  channels!: Table<ChannelRate, ID>
  settings!: Table<AppSettings, string>

  constructor() {
    super('secretary-app')

    this.version(1).stores({
      projects: 'id, updatedAt, status, targetLaunchDate',
      checklistItems: 'id, projectId, [projectId+step], dueDate',
      photos: 'id, projectId, itemId, kind, [projectId+kind]',
      bomLines: 'id, projectId, [projectId+group]',
      costSettings: 'projectId',
      pricingScenarios: 'projectId',
      inventoryParams: 'projectId',
      labelSpecs: 'projectId',
      channels: 'id, order',
      settings: 'id',
    })
  }
}

export const db = new SecretaryDB()

export const newId = (): ID =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const nowISO = (): string => new Date().toISOString()
