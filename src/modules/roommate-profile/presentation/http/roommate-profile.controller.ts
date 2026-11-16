import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { PaginatedResponseDto } from 'shared/presentation/pagination/paginated.response.dto';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { RoommateProfileSaveCommand } from '../../application/commands/roommate-profile-save/roommate-profile-save.command';
import { RoommateProfileGetMyQuery } from '../../application/queries/roommate-profile-get-my/roommate-profile-get-my.query';
import { RoommateProfileGetByIdQuery } from '../../application/queries/roommate-profile-get-by-id/roommate-profile-get-by-id.query';
import { RoommateProfileSearchQuery } from '../../application/queries/roommate-profile-search/roommate-profile-search.query';
import {
  MyRoommateProfileResult,
  PublicRoommateProfileResult,
} from '../../application/roommate-profile.result';
import {
  MyRoommateProfileResponseDto,
  PublicRoommateProfileResponseDto,
} from './responses/roommate-profile.response.dto';
import { ROOMMATE_PROFILE_RESPONSE_CODE } from './constants/roommate-profile-response-code.constant';
import {
  RoommateProfileSaveRequest,
  RoommateProfileSearchRequest,
} from './roommate-profile.request';

@ApiTags('Matching')
@ApiBearerAuth()
@ApiExtraModels(MyRoommateProfileResponseDto, PublicRoommateProfileResponseDto)
@Roles(UserRole.TENANT)
@Controller()
export class RoommateProfileController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Put('me/roommate-profile')
  @HttpCode(HttpStatus.OK)
  @ResponseCode(ROOMMATE_PROFILE_RESPONSE_CODE.SAVED)
  @ApiOperation({
    operationId: 'putMeRoommateProfile',
    summary: 'Save my roommate profile',
  })
  @ApiResponse({ status: HttpStatus.OK, type: MyRoommateProfileResponseDto })
  async save(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RoommateProfileSaveRequest,
  ) {
    const result = await this.commandBus.execute<
      RoommateProfileSaveCommand,
      MyRoommateProfileResult
    >(new RoommateProfileSaveCommand(user.id, body));
    return MyRoommateProfileResponseDto.fromReadModel(result);
  }

  @Get('me/roommate-profile')
  @ResponseCode(ROOMMATE_PROFILE_RESPONSE_CODE.FETCHED)
  @ApiOperation({
    operationId: 'getMeRoommateProfile',
    summary: 'Get my roommate profile',
  })
  @ApiResponse({ status: HttpStatus.OK, type: MyRoommateProfileResponseDto })
  async mine(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.queryBus.execute<
      RoommateProfileGetMyQuery,
      MyRoommateProfileResult
    >(new RoommateProfileGetMyQuery(user.id));
    return MyRoommateProfileResponseDto.fromReadModel(result);
  }

  @Get('roommate-profiles')
  @ResponseCode(ROOMMATE_PROFILE_RESPONSE_CODE.LIST_FETCHED)
  @ApiOperation({
    operationId: 'getRoommateProfiles',
    summary: 'Search roommate profiles',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'integer', example: 200 },
        code: {
          type: 'string',
          example: ROOMMATE_PROFILE_RESPONSE_CODE.LIST_FETCHED,
        },
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(PublicRoommateProfileResponseDto) },
        },
        pagination: { type: 'object' },
      },
    },
  })
  async search(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RoommateProfileSearchRequest,
  ) {
    const result = await this.queryBus.execute<
      RoommateProfileSearchQuery,
      PaginatedResult<PublicRoommateProfileResult>
    >(
      new RoommateProfileSearchQuery(user.id, {
        pageNo: query.pageNo,
        pageSize: query.pageSize,
        preferredArea: query.filter?.preferredArea,
      }),
    );
    return PaginatedResponseDto.create({
      data: result.data.map(PublicRoommateProfileResponseDto.fromReadModel),
      pagination: result.pagination,
    });
  }

  @Get('roommate-profiles/:roommateProfileId')
  @ResponseCode(ROOMMATE_PROFILE_RESPONSE_CODE.FETCHED)
  @ApiOperation({
    operationId: 'getRoommateProfileById',
    summary: 'Get a public roommate profile',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PublicRoommateProfileResponseDto,
  })
  async detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roommateProfileId', new ParseUUIDPipe()) id: string,
  ) {
    const result = await this.queryBus.execute<
      RoommateProfileGetByIdQuery,
      PublicRoommateProfileResult
    >(new RoommateProfileGetByIdQuery(user.id, id));
    return PublicRoommateProfileResponseDto.fromReadModel(result);
  }
}
