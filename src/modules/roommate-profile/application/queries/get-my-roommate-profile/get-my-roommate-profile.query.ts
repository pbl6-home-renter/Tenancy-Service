import { IQuery } from '@nestjs/cqrs';

export class GetMyRoommateProfileQuery implements IQuery {
  constructor(readonly tenantId: string) {}
}
