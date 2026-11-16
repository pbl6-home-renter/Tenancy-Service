import { IQuery } from '@nestjs/cqrs';

export class GetRoommateProfileQuery implements IQuery {
  constructor(
    readonly viewerId: string,
    readonly profileId: string,
  ) {}
}
