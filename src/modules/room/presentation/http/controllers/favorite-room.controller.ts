import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import type { Response } from 'express';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { PaginatedResponseDto } from 'shared/presentation/pagination/paginated.response.dto';
import {
  FavoriteRoomAddCommand,
  FavoriteRoomRemoveCommand,
} from '../../../application/commands/favorite-room/favorite-room.command';
import { RoomPublicSearchQuery } from '../../../application/queries/room-public-search/room-public-search.query';
import { RoomPublicSearchResult } from '../../../application/queries/room-public-search/room-public-search.result';
import { PublicRoomsQueryRequest } from '../requests/public-rooms-query.request';
import { RoomPublicListResponseDto } from '../responses/room-public-list.response.dto';

export class FavoriteRoomAddRequest {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  roomId: Uuid;
}

@ApiTags('FavoriteRoom')
@ApiBearerAuth()
@Roles(UserRole.TENANT)
@Controller('me/favorite-rooms')
export class FavoriteRoomController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ResponseCode('ROOMS_FAVORITE_FETCHED')
  @ApiOperation({
    operationId: 'getMeFavoriteRooms',
    summary: 'List my public available favorite rooms',
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() request: PublicRoomsQueryRequest,
  ) {
    const result = await this.queries.execute<
      RoomPublicSearchQuery,
      PaginatedResult<RoomPublicSearchResult>
    >(new RoomPublicSearchQuery(request, user.id, true));
    return PaginatedResponseDto.create({
      ...result,
      data: result.data.map((room) => ({
        ...RoomPublicListResponseDto.fromReadModel(room),
        roomId: room.id,
      })),
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseCode('ROOM_FAVORITED')
  @ApiOperation({
    operationId: 'postMeFavoriteRooms',
    summary: 'Save a public available room',
  })
  async add(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: FavoriteRoomAddRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.commands.execute(
      new FavoriteRoomAddCommand(user.id, request.roomId),
    );
    response.setHeader(
      'Location',
      `/api/v1/me/favorite-rooms/${request.roomId}`,
    );
    return result;
  }

  @Delete(':roomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'deleteMeFavoriteRoomsRoomid',
    summary: 'Remove a saved room, including unavailable rooms',
  })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roomId', ParseUUIDPipe) roomId: Uuid,
  ): Promise<void> {
    await this.commands.execute(new FavoriteRoomRemoveCommand(user.id, roomId));
  }
}
