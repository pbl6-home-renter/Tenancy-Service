import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Uuid, isValidUuid } from 'shared/domain/value-objects/uuid.vo';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { MatchRequestCreateCommand } from '../../../application/commands/match-request-create/match-request-create.command';

export class MatchRequestCreateRequestDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Tenant user ID of the recipient',
  })
  @IsUUID()
  targetId: Uuid;

  static toCommand(
    request: MatchRequestCreateRequestDto,
    requesterId: Uuid,
    key: string | undefined,
  ): MatchRequestCreateCommand {
    if (!isValidUuid(key))
      throw new ValidationException('Idempotency-Key must be a UUID');
    return new MatchRequestCreateCommand(
      requesterId,
      request.targetId,
      key as Uuid,
    );
  }
}
