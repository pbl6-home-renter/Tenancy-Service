import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { ContractMemberTypeormEntity } from 'modules/contract/infrastructure/persistence/contract-member.entity';
import { ContractTypeormEntity } from 'modules/contract/infrastructure/persistence/contract.entity';
import { RoomTypeormEntity } from 'modules/room/infrastructure/persistence/room.typeorm-entity';
import { BuildingTypeormEntity } from 'modules/building/infrastructure/persistence/building.typeorm-entity';
import { SnakeNamingStrategy } from 'shared/infrastructure/database/snake-naming.strategy';

export const landlordA = 'a0000000-0000-4000-8000-000000000001';
export const landlordB = 'b0000000-0000-4000-8000-000000000001';
export const linkedTenant = 'c0000000-0000-4000-8000-000000000001';
export const today = () => new Date().toISOString().slice(0, 10);

export async function createContractTenantFixture() {
  const url = process.env.CONTRACT_TENANT_TEST_DATABASE_URL;
  if (!url) throw new Error('CONTRACT_TENANT_TEST_DATABASE_URL is required');
  const source = await new DataSource({
    type: 'postgres',
    url,
    installExtensions: false,
    namingStrategy: new SnakeNamingStrategy(),
    entities: [
      ContractMemberTypeormEntity,
      ContractTypeormEntity,
      RoomTypeormEntity,
      BuildingTypeormEntity,
    ],
  }).initialize();
  const runner = source.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  const close = async () => {
    try {
      await runner.rollbackTransaction();
    } finally {
      await runner.release();
      await source.destroy();
    }
  };
  const db = {
    query: <T = unknown[]>(sql: string, params?: unknown[]): Promise<T> =>
      runner.query(sql, params),
    exec: (sql: string): Promise<unknown> => runner.query(sql),
    close,
  };
  // Only the existing columns read by this feature; never a production migration.
  // A single connection and temporary tables keep fixtures outside real schemas.
  try {
    await db.exec(`
    SET LOCAL search_path TO pg_temp, pg_catalog;
    CREATE TEMP TABLE contracts (
      id uuid PRIMARY KEY, landlord_id uuid NOT NULL, room_id uuid NOT NULL,
      status text NOT NULL, activated_at timestamptz, is_deleted boolean NOT NULL DEFAULT false,
      lock_termination_cycle_id uuid, handover_completed_on date
    );
    CREATE TEMP TABLE contract_members (
      id uuid PRIMARY KEY, contract_id uuid NOT NULL REFERENCES contracts(id),
      tenant_id uuid, tenant_name text, tenant_phone text, joined_at date NOT NULL,
      left_at date, is_deleted boolean NOT NULL DEFAULT false,
      CHECK (left_at IS NULL OR left_at >= joined_at),
      CHECK (tenant_id IS NOT NULL OR
        (NULLIF(BTRIM(tenant_name), '') IS NOT NULL AND tenant_phone IS NOT NULL))
    );
    CREATE UNIQUE INDEX ON contract_members (contract_id, tenant_id)
      WHERE tenant_id IS NOT NULL AND left_at IS NULL AND is_deleted = false;
  `);
  } catch (error) {
    await close();
    throw error;
  }
  return {
    db,
    repository: runner.manager.getRepository(ContractMemberTypeormEntity),
    async contract(
      options: {
        landlordId?: string;
        status?: string;
        activated?: boolean;
        deleted?: boolean;
        lockCycle?: boolean;
        handover?: string | null;
      } = {},
    ) {
      const id = randomUUID();
      await db.query(
        `INSERT INTO contracts
        (id, landlord_id, room_id, status, activated_at, is_deleted,
         lock_termination_cycle_id, handover_completed_on)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          options.landlordId ?? landlordA,
          randomUUID(),
          options.status ?? 'active',
          options.activated === false ? null : '2020-01-01T00:00:00Z',
          options.deleted ?? false,
          options.lockCycle ? randomUUID() : null,
          options.handover ?? null,
        ],
      );
      return id;
    },
    async member(
      contractId: string,
      options: {
        id?: string;
        tenantId?: string | null;
        name?: string | null;
        phone?: string | null;
        joined?: string;
        left?: string | null;
        deleted?: boolean;
      } = {},
    ) {
      const id = options.id ?? randomUUID();
      await db.query(
        `INSERT INTO contract_members
        (id, contract_id, tenant_id, tenant_name, tenant_phone, joined_at, left_at, is_deleted)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          contractId,
          options.tenantId === undefined ? linkedTenant : options.tenantId,
          options.name === undefined ? 'Khách mẫu' : options.name,
          options.phone === undefined ? '0900000000' : options.phone,
          options.joined ?? '2020-01-01',
          options.left ?? null,
          options.deleted ?? false,
        ],
      );
      return id;
    },
  };
}
