/** Correlated predicate using trusted outer aliases and physical column names. */
export function landlordLockedSql(alias: 'building' | 'contract'): string {
  return `EXISTS (SELECT 1 FROM landlord_lock_states landlord_lock
    WHERE landlord_lock.user_id = "${alias}"."landlord_id"
      AND landlord_lock.is_locked = true)`;
}
