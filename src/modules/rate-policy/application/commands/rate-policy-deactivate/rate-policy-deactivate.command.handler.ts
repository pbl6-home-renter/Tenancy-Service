import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { RatePolicyEntity } from '../../../domain/entities/rate-policy.entity';
import { RatePolicyNotFoundException } from '../../../domain/exceptions/rate-policy-not-found.exception';
import { RatePolicyNotOwnedException } from '../../../domain/exceptions/rate-policy-not-owned.exception';
import { RatePolicyRepository } from '../../../domain/repositories/rate-policy.repository';
import { RATE_POLICY_DI_TOKEN } from '../../../rate-policy.di-token';
import { RatePolicyDeactivateCommand } from './rate-policy-deactivate.command';

@CommandHandler(RatePolicyDeactivateCommand)
export class RatePolicyDeactivateCommandHandler implements ICommandHandler<
  RatePolicyDeactivateCommand,
  RatePolicyEntity
> {
  constructor(
    @Inject(RATE_POLICY_DI_TOKEN.REPOSITORY)
    private readonly policies: RatePolicyRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outbox: OutboxRepository,
  ) {}

  execute(command: RatePolicyDeactivateCommand): Promise<RatePolicyEntity> {
    return this.unitOfWork.run(async (context) => {
      const policy = await this.policies.findByIdForUpdate(
        command.policyId,
        context,
      );
      if (!policy) throw new RatePolicyNotFoundException(command.policyId);
      if (policy.landlordId !== command.landlordId)
        throw new RatePolicyNotOwnedException(
          command.policyId,
          command.landlordId,
        );
      policy.deactivate();
      await this.policies.save(policy, context);
      await this.outbox.append(
        policy
          .pullDomainEvents()
          .map((event) => OutboxMessage.fromDomainEvent(event)),
        context,
      );
      return policy;
    });
  }
}
