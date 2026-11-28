export interface TenantSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface TenantDirectoryPort {
  isLocked(id: string): Promise<boolean>;
  findActive(ids: readonly string[]): Promise<Map<string, TenantSummary>>;
}
