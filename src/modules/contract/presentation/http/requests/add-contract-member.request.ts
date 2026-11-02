import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDate,
  isDateString,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractMemberAddCommand } from '../../../application/commands/contract-member-add/contract-member-add.command';
import { TenantPhone } from '../../../domain/value-objects/tenant-phone.vo';

export class AddContractMemberRequest {
  static readonly unexpectedFieldCode = 'VALIDATION_FAILED';

  @ApiProperty({ format: 'uuid' })
  @IsUuid()
  contractId: Uuid;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @IsUuid()
  tenantId?: Uuid | null;

  @ApiProperty({ minLength: 1, maxLength: 254 })
  @IsString()
  @Length(1, 254)
  tenantName: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    pattern: TenantPhone.PATTERN.source,
  })
  @IsOptional()
  @Matches(TenantPhone.PATTERN)
  tenantPhone?: string | null;

  @ApiProperty({ type: String, format: 'date' })
  @Transform(
    ({ value }) =>
      typeof value === 'string' &&
      /^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value) &&
      isDateString(value, { strict: true })
        ? new Date(`${value}T00:00:00.000Z`)
        : new Date(NaN),
    { toClassOnly: true },
  )
  @IsDate()
  joinedAt: Date;

  static toCommand(
    request: AddContractMemberRequest,
    landlordId: Uuid,
  ): ContractMemberAddCommand {
    return new ContractMemberAddCommand(landlordId, {
      contractId: request.contractId,
      tenantId: request.tenantId ?? null,
      tenantName: request.tenantName,
      tenantPhone: request.tenantPhone ?? null,
      joinedAt: request.joinedAt,
    });
  }
}
