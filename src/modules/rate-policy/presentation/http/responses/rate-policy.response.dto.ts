import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RatePolicyEntity } from '../../../domain/entities/rate-policy.entity';
import { RatePolicyScope } from '../../../domain/enums/rate-policy-scope.enum';
import { RateItemResponseDto } from './rate-item.response.dto';

export class RatePolicyResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;
  @ApiProperty({ format: 'uuid' })
  landlordId: string;
  @ApiProperty({ enum: RatePolicyScope })
  scope: RatePolicyScope;
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  buildingId: string | null;
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  roomId: string | null;
  @ApiProperty({ type: [RateItemResponseDto] })
  rates: RateItemResponseDto[];
  @ApiProperty()
  isActive: boolean;
  @ApiProperty({ format: 'date-time' })
  createdAt: Date;
  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;

  static fromDomain(policy: RatePolicyEntity): RatePolicyResponseDto {
    const response = new RatePolicyResponseDto();
    response.id = policy.id;
    response.landlordId = policy.landlordId;
    response.scope = policy.scope;
    response.buildingId = policy.buildingId;
    response.roomId = policy.roomId;
    response.rates = policy.rates.map((rate) => rate.toProps());
    response.isActive = policy.isActive;
    response.createdAt = policy.createdAt;
    response.updatedAt = policy.updatedAt;
    return response;
  }
}
