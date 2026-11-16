import { IQuery } from '@nestjs/cqrs';

export class RoommateProfileGetByIdQuery implements IQuery {
  constructor(
    readonly viewerId: string,
    readonly profileId: string,
  ) {}
}
