import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { BuildingCreateCommand } from '../../../application/commands/building-create/building-create.command';
import { BuildingEntity } from '../../../domain/entities/building.entity';
import { BuildingResponseCodeConstant } from '../constants/building-response-code.constant';
import { CreateBuildingRequest } from '../requests/create-building.request';
import { BuildingResponseDto } from '../responses/building.response.dto';

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
}
