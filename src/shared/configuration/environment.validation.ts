type Environment = Record<string, unknown>;

const TENANCY_DATABASE = 'tenancy_db';
const VALID_NODE_ENVIRONMENTS = new Set([
  'dev',
  'development',
  'test',
  'prod',
  'production',
]);

export function validateEnvironment(config: Environment): Environment {
  const port = parseInteger(config.PORT ?? '3002', 'PORT');
  if (port !== 3002) {
    throw new Error('Environment variable "PORT" must be 3002');
  }

  const nodeEnvironment = readString(
    config.NODE_ENV ?? 'development',
    'NODE_ENV',
  );
  if (!VALID_NODE_ENVIRONMENTS.has(nodeEnvironment)) {
    throw new Error(
      'Environment variable "NODE_ENV" must be dev, development, test, prod, or production',
    );
  }

  config.APP_NAME = readString(
    config.APP_NAME ?? 'tenancy-service',
    'APP_NAME',
  );
  config.PORT = String(port);
  config.NODE_ENV = nodeEnvironment;

  const jwksUrl = readOptionalString(config.JWKS_URL);
  const publicKey = readOptionalString(config.JWT_PUBLIC_KEY);
  if (!jwksUrl && !publicKey) {
    throw new Error(
      'Either environment variable "JWKS_URL" or "JWT_PUBLIC_KEY" is required',
    );
  }
  if (jwksUrl) {
    validateUrl(jwksUrl, 'JWKS_URL', ['http:', 'https:']);
    config.JWKS_URL = jwksUrl;
  }

  config.JWT_ISSUER = readString(
    config.JWT_ISSUER ?? 'rentify-identity',
    'JWT_ISSUER',
  );
  config.JWT_AUDIENCE = readString(
    config.JWT_AUDIENCE ?? 'rentify-api',
    'JWT_AUDIENCE',
  );
  config.SERVICE_TOKEN = readOptionalString(config.SERVICE_TOKEN) ?? '';

  const databaseUrl = readOptionalString(config.DATABASE_URL);
  const migrationDatabaseUrl = readOptionalString(
    config.MIGRATION_DATABASE_URL,
  );
  const configuredDatabase = readOptionalString(config.DB_DATABASE);

  if (databaseUrl) {
    const runtimeDatabase = validateDatabaseUrl(databaseUrl, 'DATABASE_URL');
    if (configuredDatabase && configuredDatabase !== runtimeDatabase) {
      throw new Error(
        'Environment variable "DB_DATABASE" must match the database in "DATABASE_URL"',
      );
    }

    if (migrationDatabaseUrl) {
      const migrationDatabase = validateDatabaseUrl(
        migrationDatabaseUrl,
        'MIGRATION_DATABASE_URL',
      );
      if (migrationDatabase !== runtimeDatabase) {
        throw new Error(
          '"MIGRATION_DATABASE_URL" must point to the same database as "DATABASE_URL"',
        );
      }
    }
  } else {
    if (configuredDatabase && configuredDatabase !== TENANCY_DATABASE) {
      throw new Error(
        `Environment variable "DB_DATABASE" must be "${TENANCY_DATABASE}"`,
      );
    }

    for (const key of ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD']) {
      if (!readOptionalString(config[key])) {
        throw new Error(`Environment variable "${key}" is required`);
      }
    }
    parseInteger(config.DB_PORT, 'DB_PORT');
    if (configuredDatabase !== TENANCY_DATABASE) {
      throw new Error(
        `Environment variable "DB_DATABASE" must be "${TENANCY_DATABASE}"`,
      );
    }
  }

  const rabbitMqUrl = readOptionalString(config.RABBITMQ_URL);
  if (rabbitMqUrl) {
    validateUrl(rabbitMqUrl, 'RABBITMQ_URL', ['amqp:', 'amqps:']);
  }

  return config;
}

function validateDatabaseUrl(value: string, key: string): string {
  const url = validateUrl(value, key, ['postgres:', 'postgresql:']);
  const database = decodeURIComponent(url.pathname.slice(1));
  if (database !== TENANCY_DATABASE && database !== 'postgres') {
    throw new Error(
      `Environment variable "${key}" must point to the service database`,
    );
  }
  return database;
}

function validateUrl(value: string, key: string, protocols: string[]): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Environment variable "${key}" must be a valid URL`);
  }

  if (!protocols.includes(url.protocol) || !url.hostname) {
    throw new Error(`Environment variable "${key}" must be a valid URL`);
  }

  return url;
}

function parseInteger(value: unknown, key: string): number {
  const stringValue = readString(value, key);
  const parsed = Number(stringValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Environment variable "${key}" must be a positive integer`);
  }
  return parsed;
}

function readString(value: unknown, key: string): string {
  const stringValue = readOptionalString(value);
  if (!stringValue) {
    throw new Error(`Environment variable "${key}" is required`);
  }
  return stringValue;
}

function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
