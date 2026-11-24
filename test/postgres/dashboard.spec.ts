import { BuildingTypeormEntity } from 'modules/building/infrastructure/persistence/building.typeorm-entity';
import { TypeOrmDashboardReader } from 'modules/dashboard/infrastructure/persistence/dashboard.reader';
import { RoomTypeormEntity } from 'modules/room/infrastructure/persistence/room.typeorm-entity';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { memoryPostgres } from '../support/postgres-memory';

jest.setTimeout(30000);
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

describe('Dashboard SQL on PostgreSQL', () => {
  let db: Awaited<ReturnType<typeof memoryPostgres>>;

  beforeAll(async () => {
    db = await memoryPostgres([BuildingTypeormEntity, RoomTypeormEntity]);
    await db.source.synchronize();
  });

  afterAll(async () => {
    await db?.close();
  });

  it('counts only active buildings and rooms in active approved buildings', async () => {
    const approved = generateUuid();
    const deletedApproved = generateUuid();
    const pending = generateUuid();
    const rejected = generateUuid();
    const landlord = generateUuid();
    for (const [id, status, isDeleted] of [
      [approved, 'approved', false],
      [deletedApproved, 'approved', true],
      [pending, 'pending', false],
      [rejected, 'rejected', false],
    ] as const) {
      await db.postgres.query(
        `INSERT INTO buildings (id, landlord_id, name, address, ward, province, latitude, longitude, status, is_deleted, note)
         VALUES ($1, $2, 'B', '12 Street', 'Ward', 'City', 16, 108, $3, $4, 'Review note')`,
        [id, landlord, status, isDeleted],
      );
    }
    for (const [buildingId, status, isDeleted] of [
      [approved, 'occupied', false],
      [approved, 'occupied', false],
      [approved, 'available', false],
      [approved, 'maintenance', false],
      [approved, 'occupied', true],
      [deletedApproved, 'occupied', false],
      [pending, 'occupied', false],
      [rejected, 'occupied', false],
    ] as const) {
      await db.postgres.query(
        `INSERT INTO rooms (id, landlord_id, building_id, name, rent_price, deposit_amount, status, is_deleted)
         VALUES ($1, $2, $3, $4, 100, 0, $5, $6)`,
        [
          generateUuid(),
          landlord,
          buildingId,
          generateUuid(),
          status,
          isDeleted,
        ],
      );
    }
    const reader = new TypeOrmDashboardReader(
      db.source.getRepository(BuildingTypeormEntity),
      db.source.getRepository(RoomTypeormEntity),
    );
    expect(await reader.readCounts()).toEqual({
      buildings: { approved: 1, pending: 1, rejected: 1 },
      rooms: { available: 1, occupied: 2, maintenance: 1 },
    });
  });
});
