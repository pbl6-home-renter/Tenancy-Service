/** Escape PostgreSQL LIKE metacharacters for literal substring matching. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
