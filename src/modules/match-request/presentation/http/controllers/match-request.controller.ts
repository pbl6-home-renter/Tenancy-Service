import {
  applyDecorators,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { PaginatedResponseDto } from 'shared/presentation/pagination/paginated.response.dto';
import { MatchRequestCreateCommand } from '../../../application/commands/match-request-create/match-request-create.command';
import { MatchRequestTransitionCommand } from '../../../application/commands/match-request-transition/match-request-transition.command';
import { MatchRequestListItemResult } from '../../../application/match-request-list.result';
import { MatchRequestListQuery } from '../../../application/queries/match-request-list/match-request-list.query';
import { MatchRequestEntity } from '../../../domain/entities/match-request.entity';
import { MatchRequestStatus } from '../../../domain/enums/match-request-status.enum';
import { MATCH_REQUEST_RESPONSE_CODE as Code } from '../constants/match-request-response-code.constant';
import { MatchRequestCreateRequestDto } from '../requests/match-request-create.request.dto';
import { MatchRequestListRequestDto } from '../requests/match-request-list.request.dto';
import {
  MatchRequestListResponseDto,
  MatchRequestParticipantResponseDto,
  MatchRequestResponseDto,
} from '../responses/match-request.response.dto';

function MatchRequestActionErrors() {
  return applyDecorators(
    ApiResponse({ status: 400, description: 'Invalid match request UUID' }),
    ApiResponse({ status: 404, description: 'MATCH_REQUEST_NOT_FOUND' }),
    ApiResponse({ status: 409, description: 'MATCH_REQUEST_NOT_PENDING' }),
  );
}

@ApiTags('Matching')
@ApiBearerAuth()
@ApiExtraModels(
  MatchRequestResponseDto,
  MatchRequestListResponseDto,
  MatchRequestParticipantResponseDto,
)
@ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
@ApiResponse({ status: 403, description: 'FORBIDDEN' })
@ApiResponse({ status: 503, description: 'Identity service unavailable' })
@Roles(UserRole.TENANT)
@Controller('match-requests')
export class MatchRequestController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ResponseCode(Code.LIST_FETCHED)
  @ApiOperation({
    operationId: 'getMatchRequests',
    summary: 'List my match requests',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'integer', enum: [200] },
        code: { type: 'string', enum: [Code.LIST_FETCHED] },
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(MatchRequestListResponseDto) },
        },
        pagination: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid query' })
  @ApiResponse({
    status: 404,
    description: 'MATCH_REQUEST_PARTICIPANT_UNAVAILABLE',
  })
  @ApiResponse({ status: 422, description: 'VALIDATION_FAILED' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() request: MatchRequestListRequestDto,
  ) {
    const result = await this.queries.execute<
      MatchRequestListQuery,
      PaginatedResult<MatchRequestListItemResult>
    >(
      new MatchRequestListQuery(user.id, {
        pageNo: request.pageNo,
        pageSize: request.pageSize,
        direction: request.filter?.direction,
        status: request.filter?.status,
      }),
    );
    return PaginatedResponseDto.create({
      data: result.data.map(MatchRequestListResponseDto.fromListItem),
      pagination: result.pagination,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseCode(Code.CREATED)
  @ApiOperation({
    operationId: 'postMatchRequests',
    summary: 'Create a match request',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiSuccessResponse({
    status: HttpStatus.CREATED,
    code: Code.CREATED,
    dataDto: MatchRequestResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 404, description: 'ROOMMATE_PROFILE_NOT_FOUND' })
  @ApiResponse({
    status: 409,
    description: 'DUPLICATE_MATCH_REQUEST or IDEMPOTENCY_KEY_REUSED',
  })
  @ApiResponse({
    status: 422,
    description: 'SELF_MATCHING_NOT_ALLOWED or VALIDATION_FAILED',
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') key: string | undefined,
    @Body() request: MatchRequestCreateRequestDto,
  ): Promise<MatchRequestResponseDto> {
    const result = await this.commands.execute<
      MatchRequestCreateCommand,
      MatchRequestEntity
    >(MatchRequestCreateRequestDto.toCommand(request, user.id, key));
    return MatchRequestResponseDto.fromDomain(result);
  }

  @Post(':matchRequestId/accept-request')
  @HttpCode(HttpStatus.OK)
  @ResponseCode(Code.ACCEPTED)
  @ApiOperation({
    operationId: 'postMatchRequestsMatchrequestidAcceptRequest',
    summary: 'Accept a match request',
  })
  @ApiSuccessResponse({ code: Code.ACCEPTED, dataDto: MatchRequestResponseDto })
  @MatchRequestActionErrors()
  async accept(
    @CurrentUser() user: AuthenticatedUser,
    @Param('matchRequestId', ParseUUIDPipe) id: Uuid,
  ): Promise<MatchRequestResponseDto> {
    return this.act(user.id, id, MatchRequestStatus.ACCEPTED);
  }

  @Post(':matchRequestId/reject-request')
  @HttpCode(HttpStatus.OK)
  @ResponseCode(Code.REJECTED)
  @ApiOperation({
    operationId: 'postMatchRequestsMatchrequestidRejectRequest',
    summary: 'Reject a match request',
  })
  @ApiSuccessResponse({ code: Code.REJECTED, dataDto: MatchRequestResponseDto })
  @MatchRequestActionErrors()
  async reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('matchRequestId', ParseUUIDPipe) id: Uuid,
  ): Promise<MatchRequestResponseDto> {
    return this.act(user.id, id, MatchRequestStatus.REJECTED);
  }

  @Post(':matchRequestId/withdraw-request')
  @HttpCode(HttpStatus.OK)
  @ResponseCode(Code.WITHDRAWN)
  @ApiOperation({
    operationId: 'postMatchRequestsMatchrequestidWithdrawRequest',
    summary: 'Withdraw a match request',
  })
  @ApiSuccessResponse({
    code: Code.WITHDRAWN,
    dataDto: MatchRequestResponseDto,
  })
  @MatchRequestActionErrors()
  async withdraw(
    @CurrentUser() user: AuthenticatedUser,
    @Param('matchRequestId', ParseUUIDPipe) id: Uuid,
  ): Promise<MatchRequestResponseDto> {
    return this.act(user.id, id, MatchRequestStatus.WITHDRAWN);
  }

  private async act(
    actorId: Uuid,
    id: Uuid,
    next: MatchRequestStatus,
  ): Promise<MatchRequestResponseDto> {
    const result = await this.commands.execute<
      MatchRequestTransitionCommand,
      MatchRequestEntity
    >(new MatchRequestTransitionCommand(actorId, id, next));
    return MatchRequestResponseDto.fromDomain(result);
  }
}
