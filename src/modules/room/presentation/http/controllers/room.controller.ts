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
  ParseUUIDPipe,
} from '@nestjs/common';
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

@ApiTags('Room')
@ApiBearerAuth()
@Controller()
export class RoomController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

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
