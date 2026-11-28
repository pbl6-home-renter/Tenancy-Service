import { readFile } from 'node:fs/promises';
import { isValidUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface LandlordLockSnapshot {
  userId: Uuid;
  lockedAt: Date;
}

/** Accept only an explicit Identity snapshot; never infer lock times at deploy. */
export function parseLandlordLockSnapshot(
  input: unknown,
): LandlordLockSnapshot[] {
  if (!Array.isArray(input))
    throw new Error('Expected an array of locked landlords');
  return input.map((row: unknown) => {
    if (!row || typeof row !== 'object')
      throw new Error('Invalid landlord snapshot');
    const { userId, lockedAt } = row as Record<string, unknown>;
    if (
      typeof userId !== 'string' ||
      !isValidUuid(userId) ||
      typeof lockedAt !== 'string' ||
      !Number.isFinite(Date.parse(lockedAt)) ||
      new Date(lockedAt).toISOString() !== lockedAt
    )
      throw new Error(
        'Each landlord needs a UUID userId and canonical UTC lockedAt from Identity',
      );
    return { userId: userId as Uuid, lockedAt: new Date(lockedAt) };
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length !== 1)
    throw new Error('Usage: landlord-lock:backfill <identity-snapshot.json>');
  // Validate the entire file before connecting or writing anything.
  const snapshot = parseLandlordLockSnapshot(
    JSON.parse(await readFile(args[0], 'utf8')),
  );
  const { AppDataSource } =
    await import('shared/infrastructure/database/data-source');
  const { LandlordLockStateTypeormEntity } =
    await import('../persistence/landlord-lock-state.typeorm-entity');
  const { TypeOrmLandlordLockRepository } =
    await import('../persistence/landlord-lock.repository');
  const { TypeOrmTransactionContext } =
    await import('shared/infrastructure/database/transaction/typeorm-transaction-context');
  await AppDataSource.initialize();
  try {
    const repository = new TypeOrmLandlordLockRepository(
      AppDataSource.getRepository(LandlordLockStateTypeormEntity),
    );
    await AppDataSource.transaction(async (manager) => {
      const context = new TypeOrmTransactionContext(manager);
      for (const row of snapshot)
        await repository.setState(row.userId, row.lockedAt, true, context);
    });
    console.log(
      `Applied ${snapshot.length} landlord lock snapshots; newer lifecycle events take precedence.`,
    );
  } finally {
    await AppDataSource.destroy();
  }
}

if (require.main === module) {
  main().catch(() => {
    // Do not print snapshot content, connection strings, or database error detail.
    console.error(
      'Landlord lock backfill failed. Check the snapshot, migration and database configuration.',
    );
    process.exitCode = 1;
  });
}
