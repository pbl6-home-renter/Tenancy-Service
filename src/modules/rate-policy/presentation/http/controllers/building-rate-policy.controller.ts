import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { BuildingRatePoliciesBatchCommand } from '../../../application/commands/building-rate-policies-batch/building-rate-policies-batch.command';
import { RatePolicyEntity } from '../../../domain/entities/rate-policy.entity';
import { RatePoliciesRequiredException } from '../../../domain/exceptions/rate-policies-required.exception';
import { RatePolicyResponseCodeConstant as Code } from '../constants/rate-policy-response-code.constant';
import { BatchBuildingRatePoliciesRequest } from '../requests/batch-building-rate-policies.request.dto';
import { RatePolicyResponseDto } from '../responses/rate-policy.response.dto';

@ApiTags('RatePolicy')
@ApiBearerAuth()
@Roles(UserRole.LANDLORD)
@Controller('buildings/:buildingId/rate-policies')
export class BuildingRatePolicyController {
  constructor(private readonly commands: CommandBus) {}

  @Post('batch')
  @HttpCode(HttpStatus.CREATED)
  @ResponseCode(Code.RATE_POLICIES_BATCH_CREATED)
  @ApiOperation({
    operationId: 'postBuildingRatePoliciesBatch',
    summary: 'Create or replace building rate policy',
  })
  @ApiSuccessResponse({
    status: HttpStatus.CREATED,
    code: Code.RATE_POLICIES_BATCH_CREATED,
    dataDto: RatePolicyResponseDto,
  })
  async batch(
    @Param('buildingId', ParseUUIDPipe) buildingId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: BatchBuildingRatePoliciesRequest,
  ): Promise<RatePolicyResponseDto> {
    if (!request.rates.length) throw new RatePoliciesRequiredException();
    const policy = await this.commands.execute<
      BuildingRatePoliciesBatchCommand,
      RatePolicyEntity
    >(BatchBuildingRatePoliciesRequest.toCommand(request, buildingId, user.id));
    return RatePolicyResponseDto.fromDomain(policy);
  }
}
