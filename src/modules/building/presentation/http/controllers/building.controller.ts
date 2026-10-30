import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import {
  AllowLocked,
  Public,
  Roles,
} from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { PaginatedResponseDto } from 'shared/presentation/pagination/paginated.response.dto';
import { BuildingSearchPublicQuery } from '../../../application/queries/building-search-public/building-search-public.query';
import { BuildingGetPublicQuery } from '../../../application/queries/building-get-public/building-get-public.query';
import { BuildingApproveCommand } from '../../../application/commands/building-approve/building-approve.command';
import { BuildingCreateCommand } from '../../../application/commands/building-create/building-create.command';
import { BuildingDeleteCommand } from '../../../application/commands/building-delete/building-delete.command';
import { BuildingRejectCommand } from '../../../application/commands/building-reject/building-reject.command';
import { BuildingUpdateCommand } from '../../../application/commands/building-update/building-update.command';
import { BuildingEntity } from '../../../domain/entities/building.entity';
import { BuildingResponseCodeConstant } from '../constants/building-response-code.constant';
import { CreateBuildingRequest } from '../requests/create-building.request';
import { ReviewBuildingRequest } from '../requests/review-building.request';
import { UpdateBuildingRequest } from '../requests/update-building.request';
import { BuildingApproveResponseDto } from '../responses/building-approve.response.dto';
import { BuildingRejectResponseDto } from '../responses/building-reject.response.dto';
import { BuildingUpdateResponseDto } from '../responses/building-update.response.dto';
import { BuildingResponseDto } from '../responses/building.response.dto';
import {
  BuildingSearchPublicQueryRequestDto,
  PublicBuildingFilterRequestDto,
} from '../requests/building-search-public.query.request.dto';
import { PublicBuildingListResponseDto } from '../responses/public-building-list.response.dto';
import { PublicBuildingDetailResponseDto } from '../responses/public-building-detail.response.dto';

@ApiTags('Buildings')
@ApiBearerAuth()
@Controller('buildings')
export class BuildingController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @Public()
  @AllowLocked()
  @HttpCode(HttpStatus.OK)
  @ResponseCode(BuildingResponseCodeConstant.BUILDINGS_FETCHED)
  @ApiOperation({
    operationId: 'getBuildings',
    summary: 'Search public buildings',
    security: [],
  })
  @ApiQuery({
    name: 'filter',
    type: PublicBuildingFilterRequestDto,
    required: false,
    style: 'deepObject',
    explode: true,
  })
  @ApiResponse({ status: HttpStatus.OK })
  async searchPublic(
    @Query() request: BuildingSearchPublicQueryRequestDto,
  ): Promise<PaginatedResponseDto<PublicBuildingListResponseDto>> {
    const result = await this.queryBus.execute<
      BuildingSearchPublicQuery,
      PaginatedResult<BuildingEntity>
    >(BuildingSearchPublicQueryRequestDto.toQuery(request));
    return PaginatedResponseDto.create({
      data: result.data.map(PublicBuildingListResponseDto.fromDomain),
      pagination: result.pagination,
    });
  }

  @Get(':buildingId')
  @Public()
  @AllowLocked()
  @HttpCode(HttpStatus.OK)
  @ResponseCode(BuildingResponseCodeConstant.BUILDING_FETCHED)
  @ApiOperation({
    operationId: 'getBuildingsBuildingid',
    summary: 'Get public building details',
    security: [],
  })
  @ApiParam({ name: 'buildingId', type: String, format: 'uuid' })
  @ApiSuccessResponse({
    code: BuildingResponseCodeConstant.BUILDING_FETCHED,
    dataDto: PublicBuildingDetailResponseDto,
  })
  async getPublicById(
    @Param('buildingId', ParseUUIDPipe) buildingId: Uuid,
  ): Promise<PublicBuildingDetailResponseDto> {
    const building = await this.queryBus.execute<
      BuildingGetPublicQuery,
      BuildingEntity
    >(new BuildingGetPublicQuery(buildingId));
    return PublicBuildingDetailResponseDto.fromDomain(building);
  }

  @Post()
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.CREATED)
  @ResponseCode(BuildingResponseCodeConstant.BUILDING_CREATED)
  @ApiOperation({
    operationId: 'postBuildings',
    summary: 'Create building for approval',
  })
  @ApiSuccessResponse({
    status: HttpStatus.CREATED,
    code: BuildingResponseCodeConstant.BUILDING_CREATED,
    dataDto: BuildingResponseDto,
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: CreateBuildingRequest,
  ): Promise<BuildingResponseDto> {
    const building = await this.commandBus.execute<
      BuildingCreateCommand,
      BuildingEntity
    >(CreateBuildingRequest.toCommand(request, user.id));
    return BuildingResponseDto.fromDomain(building);
  }

  @Patch(':buildingId')
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(BuildingResponseCodeConstant.BUILDING_UPDATED)
  @ApiOperation({
    operationId: 'patchBuildingsBuildingid',
    summary: 'Update my unapproved building',
  })
  @ApiSuccessResponse({
    code: BuildingResponseCodeConstant.BUILDING_UPDATED,
    dataDto: BuildingUpdateResponseDto,
  })
  async update(
    @Param('buildingId', ParseUUIDPipe) buildingId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: UpdateBuildingRequest,
  ): Promise<BuildingUpdateResponseDto> {
    const building = await this.commandBus.execute<
      BuildingUpdateCommand,
      BuildingEntity
    >(UpdateBuildingRequest.toCommand(request, buildingId, user.id));
    return BuildingUpdateResponseDto.fromDomain(building);
  }

  @Delete(':buildingId')
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ResponseCode(BuildingResponseCodeConstant.BUILDING_DELETED)
  @ApiOperation({
    operationId: 'deleteBuildingsBuildingid',
    summary: 'Soft-delete my building',
  })
  @ApiSuccessResponse({
    status: HttpStatus.NO_CONTENT,
    code: BuildingResponseCodeConstant.BUILDING_DELETED,
  })
  async delete(
    @Param('buildingId', ParseUUIDPipe) buildingId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.commandBus.execute(
      new BuildingDeleteCommand(user.id, buildingId),
    );
  }

  @Post(':buildingId/approve')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(BuildingResponseCodeConstant.BUILDING_APPROVED)
  @ApiOperation({
    operationId: 'postBuildingsBuildingidApprove',
    summary: 'Approve building',
  })
  @ApiSuccessResponse({
    code: BuildingResponseCodeConstant.BUILDING_APPROVED,
    dataDto: BuildingApproveResponseDto,
  })
  async approve(
    @Param('buildingId', ParseUUIDPipe) buildingId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: ReviewBuildingRequest,
  ): Promise<BuildingApproveResponseDto> {
    const building = await this.commandBus.execute<
      BuildingApproveCommand,
      BuildingEntity
    >(new BuildingApproveCommand(user.id, buildingId, request.note));
    return BuildingApproveResponseDto.fromDomain(building);
  }

  @Post(':buildingId/reject')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(BuildingResponseCodeConstant.BUILDING_REJECTED)
  @ApiOperation({
    operationId: 'postBuildingsBuildingidReject',
    summary: 'Reject building',
  })
  @ApiSuccessResponse({
    code: BuildingResponseCodeConstant.BUILDING_REJECTED,
    dataDto: BuildingRejectResponseDto,
  })
  async reject(
    @Param('buildingId', ParseUUIDPipe) buildingId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: ReviewBuildingRequest,
  ): Promise<BuildingRejectResponseDto> {
    const building = await this.commandBus.execute<
      BuildingRejectCommand,
      BuildingEntity
    >(new BuildingRejectCommand(user.id, buildingId, request.note));
    return BuildingRejectResponseDto.fromDomain(building);
  }
}
