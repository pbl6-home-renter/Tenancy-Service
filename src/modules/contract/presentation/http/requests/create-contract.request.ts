import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsDefined,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { ContractCreateCommand } from '../../../application/commands/contract-create/contract-create.command';

export class CreateContractRequest {
  @ApiProperty({ format: 'uuid' })
  @IsDefined()
  @IsUuid()
  roomId: Uuid;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @IsUuid()
  tenantId?: Uuid | null;

  @ApiPropertyOptional({
    type: String,
    minLength: 1,
    maxLength: 254,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Length(1, 254)
  tenantName?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    pattern: '^(0[0-9]{9}|\\+84[0-9]{9})$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(0[0-9]{9}|\+84[0-9]{9})$/)
  tenantPhone?: string | null;

  @ApiProperty({ minimum: 0, type: Number })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  depositAmount: number;

  @ApiProperty({ minimum: 0, type: Number })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  rentPrice: number;

  @ApiProperty({ format: 'date', example: '2026-11-01' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate: string;

  @ApiProperty({ format: 'date', example: '2027-11-01' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate: string;

  @ApiPropertyOptional({
    type: 'integer',
    minimum: 0,
    maximum: 2147483647,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  vehicleCount?: number | null;

  static toCommand(
    request: CreateContractRequest,
    landlordId: Uuid,
  ): ContractCreateCommand {
    return new ContractCreateCommand(
      landlordId,
      request.roomId,
      request.tenantId ?? null,
      request.tenantName ?? null,
      request.tenantPhone ?? null,
      request.depositAmount,
      request.rentPrice,
      request.startDate,
      request.endDate,
      request.vehicleCount ?? null,
    );
  }
}
