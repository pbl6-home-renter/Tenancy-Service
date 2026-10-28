import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { BuildingCreateCommand } from '../../../application/commands/building-create/building-create.command';
import { BuildingEntity } from '../../../domain/entities/building.entity';
import { BuildingResponseCodeConstant } from '../constants/building-response-code.constant';
import { CreateBuildingRequest } from '../requests/create-building.request';
import { BuildingResponseDto } from '../responses/building.response.dto';
import { BuildingDeleteCommand } from '../../../application/commands/building-delete/building-delete.command';
import { BuildingUpdateCommand } from '../../../application/commands/building-update/building-update.command';
import { UpdateBuildingRequest } from '../requests/update-building.request';
import { BuildingUpdateResponseDto } from '../responses/building-update.response.dto';

@ApiTags('Buildings')
@ApiBearerAuth()
@Controller('buildings')
export class BuildingController {
  constructor(private readonly commandBus: CommandBus) {}

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
    description: 'Building created with pending approval.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'INVALID_JSON, INVALID_REQUEST_BODY or BAD_REQUEST',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'FORBIDDEN or ACCOUNT_LOCKED',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'VALIDATION_FAILED, UNEXPECTED_FIELD or GEOCODING_FAILED',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'AUTH_UNAVAILABLE or GEOCODING_UNAVAILABLE',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'INTERNAL_SERVER_ERROR',
  })
  async create(
    @Body() request: CreateBuildingRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BuildingResponseDto> {
    const building: BuildingEntity = await this.commandBus.execute(
      BuildingCreateCommand.create(user.id, request),
    );
    return BuildingResponseDto.fromDomain(building);
  }

  @Patch(':buildingId')
  @ApiParam({ name: 'buildingId', type: String, format: 'uuid' })
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
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'INVALID_JSON, INVALID_REQUEST_BODY or BAD_REQUEST',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'FORBIDDEN or ACCOUNT_LOCKED',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'RESOURCE_NOT_FOUND',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'APPROVED_BUILDING_LOCKED',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'VALIDATION_FAILED, UNEXPECTED_FIELD or GEOCODING_FAILED',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'AUTH_UNAVAILABLE or GEOCODING_UNAVAILABLE',
  })
  async update(
    @Param('buildingId', ParseUUIDPipe) buildingId: Uuid,
    @Body() request: UpdateBuildingRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BuildingUpdateResponseDto> {
    const building: BuildingEntity = await this.commandBus.execute(
      BuildingUpdateCommand.create(user.id, buildingId, request),
    );
    return BuildingUpdateResponseDto.fromDomain(building);
  }

  @Delete(':buildingId')
  @ApiParam({ name: 'buildingId', type: String, format: 'uuid' })
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
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'BAD_REQUEST' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'FORBIDDEN or ACCOUNT_LOCKED',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'RESOURCE_NOT_FOUND',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'AUTH_UNAVAILABLE',
  })
  async delete(
    @Param('buildingId', ParseUUIDPipe) buildingId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.commandBus.execute(
      new BuildingDeleteCommand(user.id, buildingId),
    );
  }
}
