import { ContractCreateCommand } from 'modules/contract/application/commands/contract-create/contract-create.command';
import { ContractCreateCommandHandler } from 'modules/contract/application/commands/contract-create/contract-create.command.handler';
import { ContractRepository } from 'modules/contract/domain/repositories/contract.repository';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { Room } from 'modules/room/domain/entities/room.entity';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { createLinkDependencies } from '../support/contract-link.fixture';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { TenantPhone } from 'modules/contract/domain/value-objects/tenant-phone.vo';

describe('ContractCreate tenant identity', () => {
  it.each(['0912345678', '+84912345678'])(
    'resolves an existing tenant by normalized phone %s before locking the room',
    async (phone) => {
      const s = createLinkDependencies();
      const tenantId = generateUuid();
      s.projection.findTenantIdByPhone.mockResolvedValue(tenantId);
      const room = Room.create({
        landlordId: generateUuid(),
        buildingId: generateUuid(),
        name: '101',
        rentPrice: 1,
        depositAmount: 0,
      });
      const rooms = { findByIdForUpdate: jest.fn(async () => room) };
      const contracts = {
        existsActiveByRoom: jest.fn(async () => false),
        save: jest.fn(),
      };
      const handler = new ContractCreateCommandHandler(
        contracts as unknown as ContractRepository,
        rooms as unknown as RoomRepository,
        s.unitOfWork,
        s.outbox as unknown as OutboxRepository,
        s.projection,
      );
      const command = new ContractCreateCommand(
        room.landlordId,
        room.id,
        null,
        'Tenant',
        phone,
        0,
        1,
        '2026-01-01',
        '2026-12-31',
        0,
      );
      const result = await handler.execute(command);
      expect(result.tenantId).toBe(tenantId);
      expect(result.status).toBe('draft');
      expect(
        (s.projection.findTenantIdByPhone.mock.calls[0][0] as TenantPhone)
          .normalizedValue,
      ).toBe('0912345678');
      expect(s.projection.lockPhone.mock.invocationCallOrder[0]).toBeLessThan(
        rooms.findByIdForUpdate.mock.invocationCallOrder[0],
      );
      expect(contracts.save).toHaveBeenCalledWith(result, s.context);
      expect(s.outbox.append).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            payload: expect.objectContaining({ tenantId }),
          }),
        ]),
        s.context,
      );
    },
  );

  it.each([true, false])(
    'preserves explicit IDs or leaves unmatched tenants NULL (explicit: %s)',
    async (explicit) => {
      const s = createLinkDependencies();
      const room = Room.create({
        landlordId: generateUuid(),
        buildingId: generateUuid(),
        name: '101',
        rentPrice: 1,
        depositAmount: 0,
      });
      const tenantId = explicit ? generateUuid() : null;
      const handler = new ContractCreateCommandHandler(
        {
          existsActiveByRoom: jest.fn(async () => false),
          save: jest.fn(),
        } as unknown as ContractRepository,
        {
          findByIdForUpdate: jest.fn(async () => room),
        } as unknown as RoomRepository,
        s.unitOfWork,
        s.outbox as unknown as OutboxRepository,
        s.projection,
      );
      const result = await handler.execute(
        new ContractCreateCommand(
          room.landlordId,
          room.id,
          tenantId,
          'Tenant',
          '0912345678',
          0,
          1,
          '2026-01-01',
          '2026-12-31',
          0,
        ),
      );
      expect(result.tenantId).toBe(tenantId);
      if (explicit)
        expect(s.projection.findTenantIdByPhone).not.toHaveBeenCalled();
    },
  );
});
