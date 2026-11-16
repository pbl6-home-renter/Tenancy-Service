import 'reflect-metadata';
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { TypeOrmMatchRequestRepository } from 'modules/match-request/infrastructure/persistence/match-request.repository';
import { MatchRequestTypeormEntity } from 'modules/match-request/infrastructure/persistence/match-request.typeorm-entity';
import { MatchRequestStatus } from 'modules/match-request/domain/enums/match-request-status.enum';
import { SnakeNamingStrategy } from 'shared/infrastructure/database/snake-naming.strategy';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('match request persistence boundaries', () => {
  it('defines unique indexes for the pending unordered pair and request key', async () => {
    const dataSource = new DataSource({
      type: 'postgres',
      namingStrategy: new SnakeNamingStrategy(),
      entities: [MatchRequestTypeormEntity],
    });
    await (
      dataSource as unknown as { buildMetadatas(): Promise<void> }
    ).buildMetadatas();
    const metadata = dataSource.getMetadata(MatchRequestTypeormEntity);
    expect(
      metadata.indices.find(
        (index) => index.givenName === 'UQ_match_requests_pending_pair',
      ),
    ).toMatchObject({
      isUnique: true,
      where: "status = 'pending' AND is_deleted = false",
    });
    expect(
      metadata.indices.find(
        (index) => index.givenName === 'UQ_match_requests_request_key',
      )?.isUnique,
    ).toBe(true);
  });

  it('filters by the caller and paginates with a stable order', async () => {
    const dataSource = new DataSource({
      type: 'postgres',
      namingStrategy: new SnakeNamingStrategy(),
      entities: [MatchRequestTypeormEntity],
    });
    await (
      dataSource as unknown as { buildMetadatas(): Promise<void> }
    ).buildMetadatas();
    const actorId = generateUuid();
    let sql = '';
    let params: Record<string, unknown> = {};
    let skip: number | undefined;
    let take: number | undefined;
    const spy = jest
      .spyOn(SelectQueryBuilder.prototype, 'getManyAndCount')
      .mockImplementation(function (
        this: SelectQueryBuilder<MatchRequestTypeormEntity>,
      ) {
        sql = this.getQuery();
        params = this.getParameters();
        skip = this.expressionMap.skip;
        take = this.expressionMap.take;
        return Promise.resolve([[], 0]);
      });
    try {
      const repository = new TypeOrmMatchRequestRepository(
        dataSource.getRepository(MatchRequestTypeormEntity),
      );
      const result = await repository.findPage(actorId, {
        pageNo: 2,
        pageSize: 10,
        direction: 'incoming',
        status: MatchRequestStatus.PENDING,
      });
      expect(sql).toContain('"request"."target_id" = :actorId');
      expect(sql).not.toContain('"request"."requester_id" = :actorId');
      expect(sql).toContain('"request"."status" = :status');
      expect(sql).toContain('ORDER BY');
      expect(params).toMatchObject({
        actorId,
        status: MatchRequestStatus.PENDING,
      });
      expect({ skip, take }).toEqual({ skip: 10, take: 10 });
      expect(result.pagination).toMatchObject({
        pageNo: 2,
        pageSize: 10,
        totalItems: 0,
      });

      await repository.findPage(actorId, { pageNo: 1, pageSize: 20 });
      expect(sql).toContain('"request"."requester_id" = :actorId');
      expect(sql).toContain('"request"."target_id" = :actorId');
      expect(sql).toContain(' OR ');
      expect(params).toMatchObject({ actorId });
      expect(params).not.toHaveProperty('status');
    } finally {
      spy.mockRestore();
    }
  });
});
