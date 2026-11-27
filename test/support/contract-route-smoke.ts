import 'reflect-metadata';
import assert from 'node:assert/strict';
import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ContractController } from 'modules/contract/presentation/http/controllers/contract.controller';
import { JwtAuthGuard } from 'shared/presentation/guards/jwt-auth.guard';
import { RolesGuard } from 'shared/presentation/guards/roles.guard';
import { ActiveUserGuard } from 'shared/presentation/guards/active-user.guard';
import { AccessTokenVerifier } from 'shared/infrastructure/security/access-token-verifier.service';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { UserStatus } from 'shared/domain/enums/user-status.enum';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

async function main() {
  const token = 'test-active-landlord-credential';
  const user = {
    id: generateUuid(),
    role: UserRole.LANDLORD,
    status: UserStatus.ACTIVE,
  };
  let verified = false,
    commands = 0;
  const verifier = {
    verify: async (value: string) => {
      if (value !== token) throw new UnauthorizedException();
      verified = true;
      return user;
    },
  };
  const module = await Test.createTestingModule({
    controllers: [ContractController],
    providers: [
      {
        provide: CommandBus,
        useValue: {
          execute: () => {
            commands++;
          },
        },
      },
      {
        provide: QueryBus,
        useValue: {
          execute: async () => ({
            data: [],
            pagination: {
              type: 'offset',
              pageNo: 1,
              pageSize: 20,
              totalItems: 0,
              totalPages: 0,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          }),
        },
      },
    ],
  }).compile();
  const app = module.createNestApplication({ logger: false });
  const reflector = new Reflector();
  app.useGlobalGuards(
    new JwtAuthGuard(reflector, verifier as unknown as AccessTokenVerifier),
    new RolesGuard(reflector),
    new ActiveUserGuard(reflector),
  );
  try {
    await app.listen(0, '127.0.0.1');
    const url = await app.getUrl();
    assert.equal((await fetch(`${url}/contracts`)).status, 401);
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    assert.equal((await fetch(`${url}/contracts`, { headers })).status, 200);
    assert.equal(verified, true);
    const response = await fetch(
      `${url}/contracts/${generateUuid()}/lock-cycles/${generateUuid()}/decision`,
      { method: 'PUT', headers, body: JSON.stringify({ action: 'restore' }) },
    );
    assert.equal(response.status, 404);
    assert.equal(commands, 0);
    console.log('Authenticated contract route 200; removed decision route 404');
  } finally {
    await app.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
