import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { RatePolicyEntity } from '../../../domain/entities/rate-policy.entity';
import { RatePolicyNotFoundException } from '../../../domain/exceptions/rate-policy-not-found.exception';
import { RatePolicyNotOwnedException } from '../../../domain/exceptions/rate-policy-not-owned.exception';
import { RatePolicyRepository } from '../../../domain/repositories/rate-policy.repository';
import { RATE_POLICY_DI_TOKEN } from '../../../rate-policy.di-token';
import { RatePolicyUpdateCommand } from './rate-policy-update.command';

@CommandHandler(RatePolicyUpdateCommand)
export class RatePolicyUpdateCommandHandler implements ICommandHandler<
  RatePolicyUpdateCommand,
  RatePolicyEntity
> {
  constructor(
    @Inject(RATE_POLICY_DI_TOKEN.REPOSITORY)
    private readonly policies: RatePolicyRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outbox: OutboxRepository,
  ) {}

  execute(command: RatePolicyUpdateCommand): Promise<RatePolicyEntity> {
    if (command.rates === undefined && command.isActive === undefined)
      throw new ValidationException('rates or isActive is required');
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
      if (command.rates !== undefined) policy.replaceRates(command.rates);
      if (command.isActive === true) policy.activate();
      if (command.isActive === false && policy.isActive) policy.deactivate();
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
