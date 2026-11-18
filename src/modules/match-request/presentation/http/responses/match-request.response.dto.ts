import { ApiProperty } from '@nestjs/swagger';
import { TenantSummary } from 'modules/roommate-profile/application/ports/tenant-directory.port';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MatchRequestListItemResult } from '../../../application/match-request-list.result';
import { MatchRequestEntity } from '../../../domain/entities/match-request.entity';
import { MatchRequestStatus } from '../../../domain/enums/match-request-status.enum';

export class MatchRequestParticipantResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty({ type: String, nullable: true }) avatarUrl: string | null;

  static fromTenant(tenant: TenantSummary): MatchRequestParticipantResponseDto {
    return Object.assign(new MatchRequestParticipantResponseDto(), tenant);
  }
}

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

export class MatchRequestListResponseDto {
  @ApiProperty({ format: 'uuid' }) id: Uuid;
  @ApiProperty({ format: 'uuid' }) requesterId: Uuid;
  @ApiProperty({ type: MatchRequestParticipantResponseDto })
  requester: MatchRequestParticipantResponseDto;
  @ApiProperty({ format: 'uuid' }) targetId: Uuid;
  @ApiProperty({ type: MatchRequestParticipantResponseDto })
  target: MatchRequestParticipantResponseDto;
  @ApiProperty({ enum: MatchRequestStatus }) status: MatchRequestStatus;
  @ApiProperty({ format: 'date-time' }) createdAt: Date;
  @ApiProperty({ format: 'date-time', nullable: true })
  respondedAt: Date | null;

  static fromListItem(
    result: MatchRequestListItemResult,
  ): MatchRequestListResponseDto {
    return Object.assign(
      new MatchRequestListResponseDto(),
      MatchRequestResponseDto.fromDomain(result.request),
      {
        requester: MatchRequestParticipantResponseDto.fromTenant(
          result.requester,
        ),
        target: MatchRequestParticipantResponseDto.fromTenant(result.target),
      },
    );
  }
}
