import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DataSourceOptions } from 'typeorm';
import type { SeederOptions } from 'typeorm-extension';
import { resolveDatabaseConfig } from '../../configuration/database.config';
import { validateEnvironment } from '../../configuration/environment.validation';
import { typeOrmBaseOptions } from './typeorm-base-options';

const envFilePath = resolve(process.cwd(), '.env');

if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

export function createDataSourceOptions(): DataSourceOptions & SeederOptions {
  validateEnvironment(process.env);

  return {
    ...typeOrmBaseOptions,
    ...resolveDatabaseConfig((key) => process.env[key], {
      preferMigrationUrl: true,
    }),
    seeds: [
      resolve(__dirname, 'seeds/**/*.seeder{.ts,.js}'),
      resolve(__dirname, '../../../modules/*/infra/seeds/**/*.seeder{.ts,.js}'),
    ],
  };
}
