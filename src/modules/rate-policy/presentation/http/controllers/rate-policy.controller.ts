import {
  Body,
  Controller,
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RatePolicyCreateCommand } from '../../../application/commands/rate-policy-create/rate-policy-create.command';
import { RatePolicyUpdateCommand } from '../../../application/commands/rate-policy-update/rate-policy-update.command';
import { RatePolicyDeactivateCommand } from '../../../application/commands/rate-policy-deactivate/rate-policy-deactivate.command';
import { RatePolicyListQuery } from '../../../application/queries/rate-policy-list/rate-policy-list.query';
import { RatePolicyEntity } from '../../../domain/entities/rate-policy.entity';
import { CreateRatePolicyRequest } from '../requests/create-rate-policy.request.dto';
import { UpdateRatePolicyRequest } from '../requests/update-rate-policy.request.dto';
import { RatePolicyListRequest } from '../requests/rate-policy-list.request.dto';
import { RatePolicyResponseDto } from '../responses/rate-policy.response.dto';
import { RatePolicyResponseCodeConstant as Code } from '../constants/rate-policy-response-code.constant';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { PaginatedResponseDto } from 'shared/presentation/pagination/paginated.response.dto';

@ApiTags('RatePolicy')
@ApiBearerAuth()
@Roles(UserRole.LANDLORD)
@Controller('rate-policies')
export class RatePolicyController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ResponseCode(Code.RATE_POLICIES_FETCHED)
  @ApiOperation({
    operationId: 'getRatePolicies',
    summary: 'List rate policies',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() request: RatePolicyListRequest,
  ): Promise<PaginatedResponseDto<RatePolicyResponseDto>> {
    const result = await this.queries.execute<
      RatePolicyListQuery,
      PaginatedResult<RatePolicyEntity>
    >(new RatePolicyListQuery(user.id, request));
    return PaginatedResponseDto.create({
      data: result.data.map(RatePolicyResponseDto.fromDomain),
      pagination: result.pagination,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseCode(Code.RATE_POLICY_CREATED)
  @ApiOperation({
    operationId: 'postRatePolicies',
    summary: 'Create rate policy',
  })
  @ApiSuccessResponse({
    status: HttpStatus.CREATED,
    code: Code.RATE_POLICY_CREATED,
    dataDto: RatePolicyResponseDto,
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: CreateRatePolicyRequest,
  ): Promise<RatePolicyResponseDto> {
    const policy = await this.commands.execute<
      RatePolicyCreateCommand,
      RatePolicyEntity
    >(CreateRatePolicyRequest.toCommand(request, user.id));
    return RatePolicyResponseDto.fromDomain(policy);
  }

  @Patch(':ratePolicyId')
  @HttpCode(HttpStatus.OK)
  @ResponseCode(Code.RATE_POLICY_UPDATED)
  @ApiOperation({
    operationId: 'patchRatePoliciesRatepolicyid',
    summary: 'Update rate policy',
  })
  @ApiSuccessResponse({
    code: Code.RATE_POLICY_UPDATED,
    dataDto: RatePolicyResponseDto,
  })
  async update(
    @Param('ratePolicyId', ParseUUIDPipe) id: Uuid,
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: UpdateRatePolicyRequest,
  ): Promise<RatePolicyResponseDto> {
    const policy = await this.commands.execute<
      RatePolicyUpdateCommand,
      RatePolicyEntity
    >(UpdateRatePolicyRequest.toCommand(request, id, user.id));
    return RatePolicyResponseDto.fromDomain(policy);
  }

  @Post(':ratePolicyId/deactivate-policy')
  @HttpCode(HttpStatus.OK)
  @ResponseCode(Code.RATE_POLICY_DEACTIVATED)
  @ApiOperation({
    operationId: 'postRatePoliciesRatepolicyidDeactivatePolicy',
    summary: 'Deactivate rate policy',
  })
  @ApiSuccessResponse({
    code: Code.RATE_POLICY_DEACTIVATED,
    dataDto: RatePolicyResponseDto,
  })
  async deactivate(
    @Param('ratePolicyId', ParseUUIDPipe) id: Uuid,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RatePolicyResponseDto> {
    const policy = await this.commands.execute<
      RatePolicyDeactivateCommand,
      RatePolicyEntity
    >(new RatePolicyDeactivateCommand(user.id, id));
    return RatePolicyResponseDto.fromDomain(policy);
  }
}
