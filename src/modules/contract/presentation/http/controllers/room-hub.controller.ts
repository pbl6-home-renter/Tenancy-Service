import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { PaginatedResponseDto } from 'shared/presentation/pagination/paginated.response.dto';
import { RoomHubListQuery } from '../../../application/queries/room-hub-list/room-hub-list.query';
import { RoomHubListResult } from '../../../application/queries/room-hub-list/room-hub-list.result';
import { RoomHubListRequestDto } from '../requests/room-hub-list.request.dto';
import { RoomHubListResponseDto } from '../responses/room-hub-list.response.dto';
import { ROOM_HUB_RESPONSE_CODE } from '../constants/room-hub-response-code.constant';

@ApiTags('Room')
@ApiBearerAuth()
@ApiExtraModels(RoomHubListResponseDto)
@Controller()
export class RoomHubController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('me/room-hub')
  @Roles(UserRole.TENANT)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(ROOM_HUB_RESPONSE_CODE.FETCHED)
  @ApiOperation({
    operationId: 'getMeRoomHub',
    summary: 'List current tenant rooms',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated current rooms',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'integer', example: 200 },
        code: { type: 'string', example: ROOM_HUB_RESPONSE_CODE.FETCHED },
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(RoomHubListResponseDto) },
        },
        pagination: { type: 'object' },
      },
    },
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() request: RoomHubListRequestDto,
  ): Promise<PaginatedResponseDto<RoomHubListResponseDto>> {
    const result = await this.queryBus.execute<
      RoomHubListQuery,
      PaginatedResult<RoomHubListResult>
    >(new RoomHubListQuery(user.id, request));
    return PaginatedResponseDto.create({
      data: result.data.map(RoomHubListResponseDto.fromReadModel),
      pagination: result.pagination,
    });
  }
}
