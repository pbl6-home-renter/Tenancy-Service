import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { AddContractMemberProps } from '../../../domain/entities/contract-member.props';

export class ContractMemberAddCommand implements ICommand {
  constructor(
    public readonly landlordId: Uuid,
    public readonly input: AddContractMemberProps,
  ) {}
}
