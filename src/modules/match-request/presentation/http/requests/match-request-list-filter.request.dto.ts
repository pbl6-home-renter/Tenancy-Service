import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { MatchRequestStatus } from '../../../domain/enums/match-request-status.enum';

export class MatchRequestListFilterRequestDto {
  @ApiPropertyOptional({ enum: ['incoming', 'outgoing'] })
  @IsOptional()
  @IsIn(['incoming', 'outgoing'])
  direction?: 'incoming' | 'outgoing';

  @ApiPropertyOptional({ enum: MatchRequestStatus })
  @IsOptional()
  @IsIn(Object.values(MatchRequestStatus))
  status?: MatchRequestStatus;
}
