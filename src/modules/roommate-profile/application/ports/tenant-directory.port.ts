export interface TenantSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface TenantDirectoryPort {
  findActive(ids: readonly string[]): Promise<Map<string, TenantSummary>>;
}
