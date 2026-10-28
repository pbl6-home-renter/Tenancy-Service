import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { PaginatedResponseDto } from 'shared/presentation/pagination/paginated.response.dto';
import { Room } from '../../../domain/entities/room.entity';
import { RoomUpdateCommand } from '../../../application/commands/room-update/room-update.command';
import { RoomDeleteCommand } from '../../../application/commands/room-delete/room-delete.command';
import { RoomMarkReadyCommand } from '../../../application/commands/room-mark-ready/room-mark-ready.command';
import { RoomResponseCodeConstant } from '../constants/room-response-code.constant';
import { GetMyRoomsRequest } from '../requests/get-my-rooms.request';
import { RoomUpdateRequest } from '../requests/room-update.request';
import { RoomMyListResponseDto } from '../responses/room-my-list.response.dto';
import { RoomUpdateResponseDto } from '../responses/room-update.response.dto';
import { RoomMarkReadyResponseDto } from '../responses/room-mark-ready.response.dto';
import { Public } from 'shared/presentation/decorators/auth/access-control.decorators';
import { RoomCreateRequest } from '../requests/room-create.request';
import { RoomCreateResponseDto } from '../responses/room-create.response.dto';
import { RoomCreateCommand } from '../../../application/commands/room-create/room-create.command';
import { PublicRoomsQueryRequest } from '../requests/public-rooms-query.request';
import { RoomPublicSearchQuery } from '../../../application/queries/room-public-search/room-public-search.query';
import { RoomPublicListResponseDto } from '../responses/room-public-list.response.dto';
import { RoomGetDetailQuery } from '../../../application/queries/room-get-detail/room-get-detail.query';
import { RoomDetailResponseDto } from '../responses/room-detail.response.dto';
import { RoomPublicSearchResult } from '../../../application/queries/room-public-search/room-public-search.result';
import { RoomDetailResult } from '../../../application/queries/room-get-detail/room-get-detail.result';

@ApiTags('Room')
@ApiBearerAuth()
@Controller()
export class RoomController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('rooms')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ResponseCode(RoomResponseCodeConstant.ROOMS_FETCHED)
  @ApiOperation({
    operationId: 'getRooms',
    summary: 'Search public rooms',
    security: [],
  })
  @ApiResponse({ status: HttpStatus.OK })
  async searchPublic(
    @Query() request: PublicRoomsQueryRequest,
  ): Promise<PaginatedResponseDto<RoomPublicListResponseDto>> {
    const result = await this.queryBus.execute<
      RoomPublicSearchQuery,
      PaginatedResult<RoomPublicSearchResult>
    >(PublicRoomsQueryRequest.toQuery(request));
    return PaginatedResponseDto.create({
      data: result.data.map(RoomPublicListResponseDto.fromReadModel),
      pagination: result.pagination,
    });
  }

  @Get('rooms/:roomId')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ResponseCode(RoomResponseCodeConstant.ROOM_FETCHED)
  @ApiOperation({
    operationId: 'getRoomsRoomid',
    summary: 'Get room details',
    security: [],
  })
  @ApiSuccessResponse({
    code: RoomResponseCodeConstant.ROOM_FETCHED,
    dataDto: RoomDetailResponseDto,
  })
  async getDetail(
    @Param('roomId', ParseUUIDPipe) roomId: Uuid,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<RoomDetailResponseDto> {
    const room = await this.queryBus.execute<
      RoomGetDetailQuery,
      RoomDetailResult
    >(new RoomGetDetailQuery(roomId, user));
    return RoomDetailResponseDto.fromReadModel(room);
  }

  @Post('rooms')
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.CREATED)
  @ResponseCode(RoomResponseCodeConstant.ROOM_CREATED)
  @ApiOperation({ operationId: 'postRooms', summary: 'Create room' })
  @ApiSuccessResponse({
    status: HttpStatus.CREATED,
    code: RoomResponseCodeConstant.ROOM_CREATED,
    dataDto: RoomCreateResponseDto,
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: RoomCreateRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RoomCreateResponseDto> {
    const room = await this.commandBus.execute<RoomCreateCommand, Room>(
      RoomCreateRequest.toCommand(request, user.id),
    );
    response.setHeader('Location', `/api/v1/rooms/${room.id}`);
    return RoomCreateResponseDto.fromDomain(room);
  }

  @Get('me/rooms')
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(RoomResponseCodeConstant.ROOMS_MY_FETCHED)
  @ApiOperation({ operationId: 'getMeRooms', summary: 'List my rooms' })
  @ApiResponse({ status: HttpStatus.OK })
  async getMyRooms(
    @CurrentUser() user: AuthenticatedUser,
    @Query() request: GetMyRoomsRequest,
  ): Promise<PaginatedResponseDto<RoomMyListResponseDto>> {
    const result: PaginatedResult<Room> = await this.queryBus.execute(
      GetMyRoomsRequest.toQuery(request, user.id),
    );
    return PaginatedResponseDto.create({
      data: result.data.map(RoomMyListResponseDto.fromDomain),
      pagination: result.pagination,
    });
  }

  @Patch('rooms/:roomId')
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(RoomResponseCodeConstant.ROOM_UPDATED)
  @ApiOperation({ operationId: 'patchRoomsRoomid', summary: 'Update room' })
  @ApiSuccessResponse({
    code: RoomResponseCodeConstant.ROOM_UPDATED,
    dataDto: RoomUpdateResponseDto,
  })
  async update(
    @Param('roomId', ParseUUIDPipe) roomId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: RoomUpdateRequest,
  ): Promise<RoomUpdateResponseDto> {
    const room = await this.commandBus.execute<RoomUpdateCommand, Room>(
      RoomUpdateRequest.toCommand(request, roomId, user.id),
    );
    return RoomUpdateResponseDto.fromDomain(room);
  }

  @Delete('rooms/:roomId')
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ResponseCode(RoomResponseCodeConstant.ROOM_DELETED)
  @ApiOperation({ operationId: 'deleteRoomsRoomid', summary: 'Delete room' })
  @ApiSuccessResponse({
    status: HttpStatus.NO_CONTENT,
    code: RoomResponseCodeConstant.ROOM_DELETED,
  })
  async delete(
    @Param('roomId', ParseUUIDPipe) roomId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.commandBus.execute(new RoomDeleteCommand(roomId, user.id));
  }

  @Post('rooms/:roomId/mark-ready')
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(RoomResponseCodeConstant.ROOM_MARKED_READY)
  @ApiOperation({
    operationId: 'postRoomsRoomidMarkReady',
    summary: 'Mark room ready for rent',
  })
  @ApiSuccessResponse({
    code: RoomResponseCodeConstant.ROOM_MARKED_READY,
    dataDto: RoomMarkReadyResponseDto,
  })
  async markReady(
    @Param('roomId', ParseUUIDPipe) roomId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RoomMarkReadyResponseDto> {
    const room = await this.commandBus.execute<RoomMarkReadyCommand, Room>(
      new RoomMarkReadyCommand(roomId, user.id),
    );
    return RoomMarkReadyResponseDto.fromDomain(room);
  }
}
