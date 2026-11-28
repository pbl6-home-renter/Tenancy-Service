import 'reflect-metadata';
import { memoryPostgres } from './postgres-memory';
import { LandlordLockStateTypeormEntity } from 'modules/landlord-lock/infrastructure/persistence/landlord-lock-state.typeorm-entity';

// Generate just the new projection against a disposable PostgreSQL instance.
// This never loads .env or connects to the shared application database.
export default memoryPostgres([LandlordLockStateTypeormEntity]).then((db) => {
  db.source.initialize = async () => db.source;
  db.source.destroy = async () => {
    await db.close();
    Object.assign(db.source, { isInitialized: false });
  };
  return db.source;
});
