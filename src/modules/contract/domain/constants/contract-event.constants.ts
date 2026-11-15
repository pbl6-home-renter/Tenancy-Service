export const CONTRACT_AGGREGATE_TYPE = 'Contract';

export const LANDLORD_LOCK_CYCLE_AGGREGATE_TYPE = 'LandlordLockCycle';

export const CONTRACT_NOTIFICATION_EVENTS = {
  REQUESTED: 'notification.requested',
} as const;

export const CONTRACT_EVENTS = {
  CREATED: 'contract.created',
  UPDATED: 'contract.updated',
  ACTIVATED: 'contract.activated',
  TERMINATED: 'contract.terminated',
} as const;
