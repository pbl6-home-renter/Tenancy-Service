import { PickType } from '@nestjs/swagger';
import { OffsetPaginationQueryRequestDto } from 'shared/presentation/pagination/offset-pagination.request.dto';

export class RoomHubListRequestDto extends PickType(
  OffsetPaginationQueryRequestDto,
  ['pageNo', 'pageSize'] as const,
) {
  static readonly unexpectedFieldCode = 'VALIDATION_FAILED';
}
