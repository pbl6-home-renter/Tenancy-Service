import { memoryPostgres } from '../support/postgres-memory';
import { RemoveLandlordLockSaga1795779740684 } from 'database/migrations/1795779740684-RemoveLandlordLockSaga';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

jest.setTimeout(30000);

it('runs up/down/up, converts only suspended rows and preserves terminated handover data and occupancy', async () => {
  const db = await memoryPostgres([]);
  const runner = db.source.createQueryRunner();
  const migration = new RemoveLandlordLockSaga1795779740684();
  try {
    // Focused pre-D101 fixture: real enum, dependent index/check and legacy handover columns.
    // No schema synchronization: execute the migration SQL through the existing PostgreSQL harness.
    await db.postgres.exec(`
      CREATE FUNCTION uuid_generate_v4() RETURNS uuid LANGUAGE SQL AS 'SELECT gen_random_uuid()';
      CREATE TYPE contract_status_enum AS ENUM ('draft','signed','active','suspended','expired','terminated');
      CREATE TABLE contracts (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), room_id uuid NOT NULL,
        status contract_status_enum NOT NULL DEFAULT 'draft', is_deleted boolean NOT NULL DEFAULT false,
        lock_termination_cycle_id uuid, handover_completed_on date,
        snapshot jsonb NOT NULL DEFAULT '{"keep":"unchanged"}',
        CONSTRAINT "CHK_contracts_lock_handover" CHECK (
          (lock_termination_cycle_id IS NULL AND handover_completed_on IS NULL) OR
          (lock_termination_cycle_id IS NOT NULL AND status = 'terminated'))
      );
      CREATE UNIQUE INDEX "UQ_contracts_room_occupancy" ON contracts(room_id)
        WHERE is_deleted = false AND (status IN ('active','suspended') OR
          (status = 'terminated' AND lock_termination_cycle_id IS NOT NULL AND handover_completed_on IS NULL));
      CREATE TABLE landlord_lock_cycles (id uuid PRIMARY KEY, decisions jsonb);
      INSERT INTO landlord_lock_cycles VALUES (gen_random_uuid(), '{"history":"dropped"}');
      CREATE TABLE unrelated (id int PRIMARY KEY, payload text NOT NULL);
      INSERT INTO unrelated VALUES (1, 'preserve');
    `);
    const statuses = [
      'draft',
      'signed',
      'active',
      'suspended',
      'expired',
      'terminated',
      'terminated',
      'terminated',
    ];
    const ids = statuses.map(() => generateUuid());
    const rooms = statuses.map(() => generateUuid());
    for (let i = 0; i < statuses.length; i++) {
      await db.postgres.query(
        'INSERT INTO contracts (id,room_id,status,lock_termination_cycle_id,handover_completed_on) VALUES ($1,$2,$3,$4,$5)',
        [
          ids[i],
          rooms[i],
          statuses[i],
          i >= 6 ? generateUuid() : null,
          i === 7 ? '2026-11-20' : null,
        ],
      );
    }
    const rows = async () =>
      (
        await db.postgres.query<{
          id: string;
          status: string;
          [key: string]: unknown;
        }>('SELECT * FROM contracts ORDER BY id')
      ).rows;
    const before = await rows();
    const expected = before.map((row) => ({
      ...row,
      status: row.status === 'suspended' ? 'active' : row.status,
    }));
    await migration.up(runner);
    expect(await rows()).toEqual(expected);
    expect(
      (
        await db.postgres.query(
          "SELECT to_regclass('landlord_lock_cycles') AS name",
        )
      ).rows,
    ).toEqual([{ name: null }]);
    await expect(
      db.postgres.query(
        "INSERT INTO contracts(room_id,status) VALUES ($1,'suspended')",
        [generateUuid()],
      ),
    ).rejects.toMatchObject({ code: '22P02' });
    await expect(
      db.postgres.query(
        "INSERT INTO contracts(room_id,status) VALUES ($1,'active')",
        [rooms[6]],
      ),
    ).rejects.toMatchObject({ code: '23505' });
    await expect(
      db.postgres.query(
        "UPDATE contracts SET status = 'active' WHERE id = $1",
        [ids[6]],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    const released = generateUuid();
    await db.postgres.query(
      "INSERT INTO contracts(id,room_id,status) VALUES ($1,$2,'active')",
      [released, rooms[7]],
    );
    await db.postgres.query('DELETE FROM contracts WHERE id = $1', [released]);
    await migration.down(runner);
    expect(await rows()).toEqual(expected); // Never turn every active contract back into suspended.
    expect(
      (
        await db.postgres.query(
          'SELECT COUNT(*)::int AS count FROM landlord_lock_cycles',
        )
      ).rows,
    ).toEqual([{ count: 0 }]);
    const probe = generateUuid();
    await db.postgres.query(
      "INSERT INTO contracts(id,room_id,status) VALUES ($1,$2,'suspended')",
      [probe, generateUuid()],
    );
    await db.postgres.query('DELETE FROM contracts WHERE id = $1', [probe]);
    await migration.up(runner);
    expect(await rows()).toEqual(expected);
    expect((await db.postgres.query('SELECT * FROM unrelated')).rows).toEqual([
      { id: 1, payload: 'preserve' },
    ]);
    const defaults = await db.postgres.query(
      'INSERT INTO contracts(room_id) VALUES ($1) RETURNING status',
      [generateUuid()],
    );
    expect(defaults.rows).toEqual([{ status: 'draft' }]);
  } finally {
    await db.close();
  }
});
