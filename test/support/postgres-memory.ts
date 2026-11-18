import { PGlite } from '@electric-sql/pglite';
import { DataSource, EntitySchema, QueryResult } from 'typeorm';
import { SnakeNamingStrategy } from 'shared/infrastructure/database/snake-naming.strategy';

/** Execute production TypeORM SQL against a disposable PostgreSQL WASM database, never .env. */
export async function memoryPostgres(entities: (Function | EntitySchema)[]) {
  const postgres = new PGlite();
  const source = new DataSource({
    type: 'postgres',
    uuidExtension: 'pgcrypto',
    entities,
    namingStrategy: new SnakeNamingStrategy(),
  });
  await (
    source as unknown as { buildMetadatas(): Promise<void> }
  ).buildMetadatas();
  Object.assign(source, { isInitialized: true });
  const createRunner = source.createQueryRunner.bind(source);
  source.createQueryRunner = (...args) => {
    const runner = createRunner(...args);
    runner.query = async (
      sql: string,
      parameters?: unknown[],
      structured = false,
    ) => {
      const result = await postgres.query(sql, parameters);
      const queryResult = new QueryResult();
      queryResult.records = result.rows;
      queryResult.affected = result.affectedRows;
      queryResult.raw = /^\s*(DELETE|UPDATE)\b/i.test(sql)
        ? [result.rows, result.affectedRows]
        : result.rows;
      return structured ? queryResult : queryResult.raw;
    };
    runner.release = async () => {
      Object.assign(runner, { isReleased: true });
    };
    return runner;
  };
  return { source, postgres, close: () => postgres.close() };
}
