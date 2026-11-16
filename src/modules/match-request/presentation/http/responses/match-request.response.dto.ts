import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MatchRequestEntity } from '../../../domain/entities/match-request.entity';
import { MatchRequestStatus } from '../../../domain/enums/match-request-status.enum';

export class MatchRequestResponseDto {
  @ApiProperty({ format: 'uuid' }) id: Uuid;
  @ApiProperty({ format: 'uuid' }) requesterId: Uuid;
  @ApiProperty({ format: 'uuid' }) targetId: Uuid;
  @ApiProperty({ enum: MatchRequestStatus }) status: MatchRequestStatus;
  @ApiProperty({ format: 'date-time' }) createdAt: Date;
  @ApiProperty({ format: 'date-time', nullable: true })
  respondedAt: Date | null;

  static fromDomain(request: MatchRequestEntity): MatchRequestResponseDto {
    return Object.assign(new MatchRequestResponseDto(), {
      id: request.id,
      requesterId: request.requesterId,
      targetId: request.targetId,
      status: request.status,
      createdAt: request.createdAt,
      respondedAt: request.respondedAt,
    });
  }
}
