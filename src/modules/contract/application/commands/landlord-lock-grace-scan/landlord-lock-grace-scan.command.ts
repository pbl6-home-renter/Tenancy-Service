import { ICommand } from '@nestjs/cqrs';

export class LandlordLockGraceScanCommand implements ICommand {
  constructor(public readonly now: Date) {}
}
