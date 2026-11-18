import { QueryRunner } from 'typeorm';
import { memoryPostgres } from '../support/postgres-memory';
import { RoomTypeormEntity } from 'modules/room/infrastructure/persistence/room.typeorm-entity';
import { BuildingTypeormEntity } from 'modules/building/infrastructure/persistence/building.typeorm-entity';
import { FavoriteRoomTypeormEntity } from 'modules/room/infrastructure/persistence/favorite-room.typeorm-entity';
import { TypeOrmFavoriteRoomRepository } from 'modules/room/infrastructure/persistence/favorite-room.repository';
import { TypeOrmRoomReadRepository } from 'modules/room/infrastructure/persistence/room-read.repository';
import { CreateFavoriteRoomsTable1795000000000 } from 'database/migrations/1795000000000-CreateFavoriteRoomsTable';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { BuildingStatus } from 'modules/building/domain/enums/building-status.enum';

jest.setTimeout(30000);
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

describe('Favorite room SQL on PostgreSQL', () => {
  let db: Awaited<ReturnType<typeof memoryPostgres>>;
  let favorites: TypeOrmFavoriteRoomRepository;
  let rooms: TypeOrmRoomReadRepository;
  const tenantA = generateUuid(),
    tenantB = generateUuid(),
    buildingId = generateUuid();
  const roomA = generateUuid(),
    roomB = generateUuid();

  beforeAll(async () => {
    db = await memoryPostgres([
      RoomTypeormEntity,
      BuildingTypeormEntity,
      FavoriteRoomTypeormEntity,
    ]);
    // Exercise the shipped migration, rather than synchronizing its replacement table.
    db.source.getMetadata(FavoriteRoomTypeormEntity).synchronize = false;
    await db.source.synchronize();
    await new CreateFavoriteRoomsTable1795000000000().up(
      db.source.createQueryRunner(),
    );
    await db.postgres.query(
      `INSERT INTO buildings (id, landlord_id, name, address, ward, province, latitude, longitude, status)
      VALUES ($1, $2, 'Building A', '12 Street', 'Ward A', 'City A', 16, 108, 'approved')`,
      [buildingId, generateUuid()],
    );
    await db.postgres.query(
      `INSERT INTO rooms (id, landlord_id, building_id, name, rent_price, deposit_amount)
      VALUES ($1, $3, $4, '101', 100, 0), ($2, $3, $4, '102', 200, 0)`,
      [roomA, roomB, generateUuid(), buildingId],
    );
    favorites = new TypeOrmFavoriteRoomRepository(
      db.source.getRepository(FavoriteRoomTypeormEntity),
    );
    rooms = new TypeOrmRoomReadRepository(
      db.source.getRepository(RoomTypeormEntity),
    );
  });

  afterAll(async () => {
    await db?.close();
  });

  it('returns an empty page for a new tenant without requiring a profile', async () => {
    const page = await rooms.searchPublic(
      { pageNo: 1, pageSize: 20 },
      tenantB,
      true,
    );
    expect(page.data).toEqual([]);
    expect(page.pagination.totalItems).toBe(0);
  });

  it('saves once, serializes duplicate saves, scopes listing and favorite flags to the viewer', async () => {
    const results = await Promise.all([
      favorites.addIfPublic(tenantA, roomA),
      favorites.addIfPublic(tenantA, roomA),
    ]);
    expect(results.filter((item) => item?.added)).toHaveLength(1);
    const mine = await rooms.searchPublic(
      { pageNo: 1, pageSize: 1 },
      tenantA,
      true,
    );
    expect(mine.data).toMatchObject([
      {
        id: roomA,
        isFavorited: true,
        ward: 'Ward A',
        buildingName: 'Building A',
      },
    ]);
    expect(mine.pagination.totalItems).toBe(1);
    expect(
      (await rooms.searchPublic({ pageNo: 1, pageSize: 20 }, tenantB, true))
        .data,
    ).toEqual([]);
    expect(
      (await rooms.searchPublic({ pageNo: 1, pageSize: 20 })).data.every(
        (item) => item.isFavorited === false,
      ),
    ).toBe(true);
    expect(await favorites.remove(tenantB, roomA)).toBe(false);
    expect(await rooms.findDetailById(roomA)).toMatchObject({
      address: '12 Street',
      ward: 'Ward A',
      province: 'City A',
    });
  });

  it('keeps pagination counts and filters scoped to saved rooms', async () => {
    await favorites.addIfPublic(tenantA, roomB);
    const first = await rooms.searchPublic(
      { pageNo: 1, pageSize: 1 },
      tenantA,
      true,
    );
    const next = await rooms.searchPublic(
      { pageNo: 2, pageSize: 1 },
      tenantA,
      true,
    );
    expect(first.pagination).toMatchObject({
      totalItems: 2,
      hasNextPage: true,
    });
    expect(next.data[0].id).not.toBe(first.data[0].id);
    const filtered = await rooms.searchPublic(
      { pageNo: 1, pageSize: 20, filter: { ward: 'Other ward' } },
      tenantA,
      true,
    );
    expect(filtered.pagination.totalItems).toBe(0);
  });

  it('hides unavailable rooms, prevents saving them, but permits removing the saved row', async () => {
    await db.postgres.query(
      `UPDATE rooms SET status = 'occupied' WHERE id = $1`,
      [roomA],
    );
    expect(await favorites.addIfPublic(tenantB, roomA)).toBeNull();
    expect(
      (
        await rooms.searchPublic({ pageNo: 1, pageSize: 20 }, tenantA, true)
      ).data.map((item) => item.id),
    ).toEqual([roomB]);
    expect(await favorites.remove(tenantA, roomA)).toBe(true);
    expect(await favorites.remove(tenantA, roomA)).toBe(false);
    await db.source
      .getRepository(BuildingTypeormEntity)
      .update(buildingId, { status: BuildingStatus.PENDING });
    expect(await favorites.addIfPublic(tenantB, roomB)).toBeNull();
    expect(
      (await rooms.searchPublic({ pageNo: 1, pageSize: 20 }, tenantA, true))
        .data,
    ).toEqual([]);
  });

  it('reverts and reapplies the migration', async () => {
    const migration = new CreateFavoriteRoomsTable1795000000000();
    const runner = db.source.createQueryRunner() as QueryRunner;
    await migration.down(runner);
    expect(
      (await db.postgres.query(`SELECT to_regclass('favorite_rooms') AS name`))
        .rows,
    ).toEqual([{ name: null }]);
    await migration.up(runner);
    expect(
      (await rooms.searchPublic({ pageNo: 1, pageSize: 20 }, tenantA, true))
        .data,
    ).toEqual([]);
  });
});
