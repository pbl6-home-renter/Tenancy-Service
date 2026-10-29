import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { PaginatedResponseDto } from 'shared/presentation/pagination/paginated.response.dto';
import { BuildingGetAdminQuery } from '../../../application/queries/building-get-admin/building-get-admin.query';
import { BuildingGetAdminResult } from '../../../application/queries/building-get-admin/building-get-admin.result';
import { BuildingListForAdminQuery } from '../../../application/queries/building-list-for-admin/building-list-for-admin.query';
import { BuildingListForAdminResult } from '../../../application/queries/building-list-for-admin/building-list-for-admin.result';
import { BuildingResponseCodeConstant } from '../constants/building-response-code.constant';
import {
  AdminBuildingFilterRequestDto,
  BuildingListForAdminQueryRequestDto,
} from '../requests/building-list-for-admin.query.request.dto';
import { AdminBuildingDetailResponseDto } from '../responses/admin-building-detail.response.dto';
import { AdminBuildingListResponseDto } from '../responses/admin-building-list.response.dto';

@ApiTags('Buildings')
@ApiBearerAuth()
@Controller('admin/buildings')
export class AdminBuildingController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(BuildingResponseCodeConstant.BUILDINGS_ADMIN_FETCHED)
  @ApiOperation({
    operationId: 'getAdminBuildings',
    summary: 'List buildings for admin approval',
  })
  @ApiQuery({
    name: 'filter',
    type: AdminBuildingFilterRequestDto,
    required: false,
    style: 'deepObject',
    explode: true,
  })
  @ApiResponse({ status: HttpStatus.OK })
  async list(
    @Query() request: BuildingListForAdminQueryRequestDto,
  ): Promise<PaginatedResponseDto<AdminBuildingListResponseDto>> {
    const result = await this.queryBus.execute<
      BuildingListForAdminQuery,
      PaginatedResult<BuildingListForAdminResult>
    >(BuildingListForAdminQueryRequestDto.toQuery(request));
    return PaginatedResponseDto.create({
      data: result.data.map(AdminBuildingListResponseDto.fromReadModel),
      pagination: result.pagination,
    });
  }

  @Get(':buildingId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(BuildingResponseCodeConstant.BUILDING_ADMIN_FETCHED)
  @ApiOperation({
    operationId: 'getAdminBuildingsBuildingid',
    summary: 'Get building details for approval',
  })
  @ApiSuccessResponse({
    code: BuildingResponseCodeConstant.BUILDING_ADMIN_FETCHED,
    dataDto: AdminBuildingDetailResponseDto,
  })
  async getById(
    @Param('buildingId', ParseUUIDPipe) buildingId: Uuid,
  ): Promise<AdminBuildingDetailResponseDto> {
    const result = await this.queryBus.execute<
      BuildingGetAdminQuery,
      BuildingGetAdminResult
    >(new BuildingGetAdminQuery(buildingId));
    return AdminBuildingDetailResponseDto.fromReadModel(result);
  }
}
