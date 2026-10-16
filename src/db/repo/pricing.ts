import { db } from '../db'
import type { ChannelOverride, ID, PricingScenario } from '../schema'

export const DEFAULT_SCENARIO: Omit<PricingScenario, 'projectId'> = {
  sellingPrice: 0,
  shippingChargedToCustomer: 0,
  shippingActualCost: 3000,
  otherVariablePerUnit: 0,
  enabledChannelIds: [],
  overrides: {},
}

export async function getScenario(projectId: ID): Promise<PricingScenario> {
  return (await db.pricingScenarios.get(projectId)) ?? { projectId, ...DEFAULT_SCENARIO }
}

export async function patchScenario(
  projectId: ID,
  patch: Partial<Omit<PricingScenario, 'projectId'>>,
): Promise<void> {
  const current = await getScenario(projectId)
  await db.pricingScenarios.put({ ...current, ...patch, projectId })
}

/** 비교표에 넣을 채널 on/off */
export async function toggleChannel(projectId: ID, channelId: ID): Promise<void> {
  const current = await getScenario(projectId)
  const on = current.enabledChannelIds.includes(channelId)
  await patchScenario(projectId, {
    enabledChannelIds: on
      ? current.enabledChannelIds.filter((id) => id !== channelId)
      : [...current.enabledChannelIds, channelId],
  })
}

/** 이 프로젝트에서만 다른 요율을 쓸 때 */
export async function setChannelOverride(
  projectId: ID,
  channelId: ID,
  override: ChannelOverride | null,
): Promise<void> {
  const current = await getScenario(projectId)
  const next = { ...current.overrides }
  if (override === null) {
    delete next[channelId]
  } else {
    next[channelId] = { ...next[channelId], ...override }
  }
  await patchScenario(projectId, { overrides: next })
}
