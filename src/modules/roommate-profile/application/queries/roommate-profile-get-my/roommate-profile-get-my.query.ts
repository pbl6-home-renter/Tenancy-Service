import { IQuery } from '@nestjs/cqrs';

export class RoommateProfileGetMyQuery implements IQuery {
  constructor(readonly tenantId: string) {}
}
