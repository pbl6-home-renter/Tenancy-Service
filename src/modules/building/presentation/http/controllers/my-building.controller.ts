import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { OffsetPaginationDto } from 'shared/presentation/pagination/offset-pagination.dto';
import { PaginatedResponseDto } from 'shared/presentation/pagination/paginated.response.dto';
import { BuildingGetMineQuery } from '../../../application/queries/building-get-mine/building-get-mine.query';
import { BuildingListMineQuery } from '../../../application/queries/building-list-mine/building-list-mine.query';
import { BuildingEntity } from '../../../domain/entities/building.entity';
import { BuildingStatus } from '../../../domain/enums/building-status.enum';
import { BuildingResponseCodeConstant } from '../constants/building-response-code.constant';
import { BuildingListMineQueryRequestDto } from '../requests/building-list-mine.query.request.dto';
import { MyBuildingDetailResponseDto } from '../responses/my-building-detail.response.dto';
import { MyBuildingListResponseDto } from '../responses/my-building-list.response.dto';

@ApiTags('Buildings')
@ApiBearerAuth()
@Roles(UserRole.LANDLORD)
@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
@ApiResponse({
  status: HttpStatus.FORBIDDEN,
  description: 'FORBIDDEN or ACCOUNT_LOCKED',
})
@ApiResponse({
  status: HttpStatus.UNPROCESSABLE_ENTITY,
  description: 'VALIDATION_FAILED or UNEXPECTED_FIELD',
})
@ApiResponse({
  status: HttpStatus.SERVICE_UNAVAILABLE,
  description: 'AUTH_UNAVAILABLE',
})
@Controller('me/buildings')
export class MyBuildingController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ResponseCode(BuildingResponseCodeConstant.BUILDINGS_MY_FETCHED)
  @ApiOperation({ operationId: 'getMeBuildings', summary: 'List my buildings' })
  @ApiQuery({
    name: 'filter',
    required: false,
    style: 'deepObject',
    explode: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        status: { type: 'string', enum: Object.values(BuildingStatus) },
      },
    },
  })
  @ApiExtraModels(MyBuildingListResponseDto, OffsetPaginationDto)
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['statusCode', 'code', 'data', 'pagination'],
      properties: {
        statusCode: { type: 'integer', enum: [200] },
        code: {
          type: 'string',
          enum: [BuildingResponseCodeConstant.BUILDINGS_MY_FETCHED],
        },
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(MyBuildingListResponseDto) },
        },
        pagination: { $ref: getSchemaPath(OffsetPaginationDto) },
      },
    },
  })
  async list(
    @Query() query: BuildingListMineQueryRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<MyBuildingListResponseDto>> {
    const result: PaginatedResult<BuildingEntity> = await this.queryBus.execute(
      new BuildingListMineQuery(user.id, query),
    );
    return PaginatedResponseDto.create({
      data: result.data.map(MyBuildingListResponseDto.fromDomain),
      pagination: result.pagination,
    });
  }

  @Get(':buildingId')
  @ApiParam({ name: 'buildingId', type: String, format: 'uuid' })
  @ResponseCode(BuildingResponseCodeConstant.BUILDING_MY_FETCHED)
  @ApiOperation({
    operationId: 'getMeBuildingsBuildingid',
    summary: 'Get my building details',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'BAD_REQUEST' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'RESOURCE_NOT_FOUND',
  })
  @ApiSuccessResponse({
    code: BuildingResponseCodeConstant.BUILDING_MY_FETCHED,
    dataDto: MyBuildingDetailResponseDto,
  })
  async getById(
    @Param('buildingId', ParseUUIDPipe) buildingId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MyBuildingDetailResponseDto> {
    const building: BuildingEntity = await this.queryBus.execute(
      new BuildingGetMineQuery(user.id, buildingId),
    );
    return MyBuildingDetailResponseDto.fromDomain(building);
  }
}
