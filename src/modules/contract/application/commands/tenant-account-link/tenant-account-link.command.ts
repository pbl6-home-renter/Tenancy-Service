import { ICommand } from '@nestjs/cqrs';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { UserStatus } from 'shared/domain/enums/user-status.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { TenantPhone } from '../../../domain/value-objects/tenant-phone.vo';

export class TenantAccountLinkCommand implements ICommand {
  constructor(
    readonly eventId: Uuid,
    readonly eventType: string,
    readonly userId: Uuid,
    readonly role: UserRole,
    readonly status: UserStatus,
    readonly phone: TenantPhone,
  ) {}
}
