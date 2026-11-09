import { createHash } from 'node:crypto';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { INVOICE_DI_TOKEN } from '../../../invoice.di-token';
import { IdempotencyKeyReusedException } from '../../../domain/exceptions/idempotency-key-reused.exception';
import { InvoiceIdempotencyRepository } from '../../ports/invoice-idempotency.repository';
import { InvoiceIssueItemService } from '../../services/invoice-issue-item.service';
import { InvoiceIssueCommand } from './invoice-issue.command';
import { InvoiceIssueResult } from './invoice-issue.result';

const OPERATION = 'postInvoicesIssueInvoice';
// One connection is held for the idempotency lock; leave room in the pool for other requests.
const ISSUE_CONCURRENCY = 4;

@CommandHandler(InvoiceIssueCommand)
export class InvoiceIssueCommandHandler implements ICommandHandler<
  InvoiceIssueCommand,
  InvoiceIssueResult
> {
  constructor(
    @Inject(INVOICE_DI_TOKEN.IDEMPOTENCY)
    private readonly keys: InvoiceIdempotencyRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    private readonly items: InvoiceIssueItemService,
  ) {}

  execute(command: InvoiceIssueCommand): Promise<InvoiceIssueResult> {
    const requestHash = createHash('sha256')
      .update(JSON.stringify([...command.invoiceIds].sort()))
      .digest('hex');
    return this.unitOfWork.run(async (context) => {
      await this.keys.lock(command.landlordId, OPERATION, command.key, context);
      const previous = await this.keys.find(
        command.landlordId,
        OPERATION,
        command.key,
        context,
      );
      if (previous) {
        if (previous.requestHash !== requestHash)
          throw new IdempotencyKeyReusedException();
        return previous.responseBody;
      }

      const result = await this.issueItems(command);
      await this.keys.save(
        command.landlordId,
        OPERATION,
        command.key,
        requestHash,
        result,
        context,
      );
      return result;
    });
  }

  private async issueItems(
    command: InvoiceIssueCommand,
  ): Promise<InvoiceIssueResult> {
    const result: InvoiceIssueResult = {
      requested: command.invoiceIds.length,
      succeeded: [],
      failed: [],
    };
    for (
      let start = 0;
      start < command.invoiceIds.length;
      start += ISSUE_CONCURRENCY
    ) {
      const batch = command.invoiceIds.slice(start, start + ISSUE_CONCURRENCY);
      const outcomes = await Promise.allSettled(
        batch.map((invoiceId) =>
          this.items.issue(invoiceId, command.landlordId),
        ),
      );
      const rejected = outcomes.find(
        (outcome) => outcome.status === 'rejected',
      );
      if (rejected?.status === 'rejected') throw rejected.reason;
      for (const outcome of outcomes) {
        if (outcome.status !== 'fulfilled') continue;
        if ('invoiceId' in outcome.value) result.failed.push(outcome.value);
        else result.succeeded.push(outcome.value);
      }
    }
    return result;
  }
}
