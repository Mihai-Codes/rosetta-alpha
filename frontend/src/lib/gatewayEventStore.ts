type GatewayNotificationEnvelope = {
  notificationType?: string
  notificationId?: string
  timestamp?: string
  notification?: Record<string, unknown>
}

export type GatewayEventRecord = {
  receivedAt: string
  notificationType: string
  notificationId?: string
  timestamp?: string
  walletAddress?: string
  txHash?: string
  amount?: string
  raw: GatewayNotificationEnvelope
}

type GatewayStore = {
  events: GatewayEventRecord[]
}

const MAX_EVENTS = 50

declare global {
  // eslint-disable-next-line no-var
  var __ROSETTA_GATEWAY_STORE__: GatewayStore | undefined
}

function getStore(): GatewayStore {
  if (!globalThis.__ROSETTA_GATEWAY_STORE__) {
    globalThis.__ROSETTA_GATEWAY_STORE__ = { events: [] }
  }
  return globalThis.__ROSETTA_GATEWAY_STORE__
}

export function addGatewayEvent(raw: GatewayNotificationEnvelope): GatewayEventRecord {
  const record: GatewayEventRecord = {
    receivedAt: new Date().toISOString(),
    notificationType: raw.notificationType ?? 'unknown',
    notificationId: raw.notificationId,
    timestamp: raw.timestamp,
    walletAddress: typeof raw.notification?.walletAddress === 'string' ? raw.notification.walletAddress : undefined,
    txHash: typeof raw.notification?.txHash === 'string' ? raw.notification.txHash : undefined,
    amount: typeof raw.notification?.amount === 'string' ? raw.notification.amount : undefined,
    raw,
  }

  const store = getStore()
  store.events.unshift(record)
  if (store.events.length > MAX_EVENTS) {
    store.events.length = MAX_EVENTS
  }
  return record
}

export function listGatewayEvents(limit = 20): GatewayEventRecord[] {
  return getStore().events.slice(0, Math.max(1, Math.min(limit, MAX_EVENTS)))
}
