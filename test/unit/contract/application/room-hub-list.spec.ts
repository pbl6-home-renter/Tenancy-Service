import 'reflect-metadata';
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { ContractTypeormEntity } from 'modules/contract/infrastructure/persistence/contract.entity';
import { ContractMemberTypeormEntity } from 'modules/contract/infrastructure/persistence/contract-member.entity';
import { RoomTypeormEntity } from 'modules/room/infrastructure/persistence/room.typeorm-entity';
import { BuildingTypeormEntity } from 'modules/building/infrastructure/persistence/building.typeorm-entity';
import { TypeOrmRoomHubPageQuery } from 'modules/contract/infrastructure/persistence/room-hub-page-query';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { SnakeNamingStrategy } from 'shared/infrastructure/database/snake-naming.strategy';

describe('room hub read query', () => {
  it('restricts rows to the caller, active contracts and non-deleted records with stable pagination', async () => {
    const db = new DataSource({
      type: 'postgres',
      namingStrategy: new SnakeNamingStrategy(),
      entities: [
        ContractTypeormEntity,
        ContractMemberTypeormEntity,
        RoomTypeormEntity,
        BuildingTypeormEntity,
      ],
    });
    await (
      db as unknown as { buildMetadatas(): Promise<void> }
    ).buildMetadatas();
    const userId = generateUuid();
    let sql = '';
    let parameters: Record<string, unknown> = {};
    const count = jest
      .spyOn(SelectQueryBuilder.prototype, 'getCount')
      .mockResolvedValue(0);
    const rows = jest
      .spyOn(SelectQueryBuilder.prototype, 'getRawMany')
      .mockImplementation(function (
        this: SelectQueryBuilder<ContractTypeormEntity>,
      ) {
        sql = this.getQuery();
        parameters = this.getParameters();
        return Promise.resolve([]);
      });
    try {
      const repo = new TypeOrmRoomHubPageQuery(
        db.getRepository(ContractTypeormEntity),
      );
      const result = await repo.findPage(userId, {
        pageNo: 2,
        pageSize: 10,
      });
      expect(parameters).toMatchObject({ tenantId: userId, status: 'active' });
      expect(sql).toMatch(/"contract"\."tenant_id" = :tenantId OR EXISTS/);
      expect(sql).toMatch(/"member"\."tenant_id" = :tenantId/);
      expect(sql).toMatch(
        /"member"\."left_at" IS NULL OR "member"\."left_at" > :today/,
      );
      for (const alias of ['contract', 'room', 'building', 'member']) {
        expect(sql).toContain(`"${alias}"."is_deleted" = false`);
      }
      expect(sql).toContain('"room"."building_id"');
      expect(sql).toMatch(/ORDER BY/);
      expect(sql).toMatch(/LIMIT 10 OFFSET 10/);
      expect(result.data).toEqual([]);
      expect(result.pagination).toMatchObject({
        totalItems: 0,
        pageNo: 2,
        hasNextPage: false,
      });
    } finally {
      count.mockRestore();
      rows.mockRestore();
    }
  });
});
