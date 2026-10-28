import { IQuery } from '@nestjs/cqrs';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class RoomGetDetailQuery implements IQuery {
  constructor(
    public readonly roomId: Uuid,
    public readonly viewer?: AuthenticatedUser,
  ) {}
}
