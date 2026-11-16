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
import { ContractTenantListQuery } from '../../../application/queries/contract-tenant-list/contract-tenant-list.query';
import { ContractTenantListResult } from '../../../application/queries/contract-tenant-list/contract-tenant-list.result';
import { ContractTenantGetByIdQuery } from '../../../application/queries/contract-tenant-get-by-id/contract-tenant-get-by-id.query';
import { ContractTenantGetByIdResult } from '../../../application/queries/contract-tenant-get-by-id/contract-tenant-get-by-id.result';
import { CONTRACT_TENANT_RESPONSE_CODE as Code } from '../constants/contract-tenant-response-code.constant';
import { ContractTenantListRequestDto } from '../requests/contract-tenant-list.request.dto';
import { ContractTenantListFilterRequestDto } from '../requests/contract-tenant-list-filter.request.dto';
import { ContractTenantListItemResponseDto } from '../responses/contract-tenant-list-item.response.dto';
import { ContractTenantDetailResponseDto } from '../responses/contract-tenant-detail.response.dto';

@ApiTags('Contract')
@ApiBearerAuth()
@Roles(UserRole.LANDLORD)
@ApiResponse({
  status: 400,
  description: 'BAD_REQUEST (including a malformed UUID path)',
})
@ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
@ApiResponse({ status: 403, description: 'FORBIDDEN' })
@ApiResponse({
  status: 422,
  description: 'VALIDATION_FAILED or UNEXPECTED_FIELD',
})
@ApiResponse({ status: 500, description: 'INTERNAL_SERVER_ERROR' })
@ApiResponse({ status: 503, description: 'AUTH_UNAVAILABLE' })
@Controller('contracts/tenants')
export class ContractTenantController {
  constructor(private readonly queries: QueryBus) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ResponseCode(Code.LIST_FETCHED)
  @ApiOperation({
    operationId: 'getContractsTenants',
    summary: 'List landlord tenants',
  })
  @ApiExtraModels(
    ContractTenantListItemResponseDto,
    OffsetPaginationDto,
    ContractTenantListFilterRequestDto,
  )
  @ApiQuery({
    name: 'filter',
    required: false,
    style: 'deepObject',
    explode: true,
    type: ContractTenantListFilterRequestDto,
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['statusCode', 'code', 'data', 'pagination'],
      properties: {
        statusCode: { type: 'integer', enum: [200] },
        code: { type: 'string', enum: [Code.LIST_FETCHED] },
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(ContractTenantListItemResponseDto) },
        },
        pagination: { $ref: getSchemaPath(OffsetPaginationDto) },
      },
    },
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() request: ContractTenantListRequestDto,
  ): Promise<PaginatedResponseDto<ContractTenantListItemResponseDto>> {
    const result = await this.queries.execute<
      ContractTenantListQuery,
      PaginatedResult<ContractTenantListResult>
    >(new ContractTenantListQuery(user.id, request));
    return PaginatedResponseDto.create({
      data: result.data.map(ContractTenantListItemResponseDto.fromReadModel),
      pagination: result.pagination,
    });
  }

  @Get(':contractMemberId')
  @HttpCode(HttpStatus.OK)
  @ResponseCode(Code.FETCHED)
  @ApiOperation({
    operationId: 'getContractsTenantsContractmemberid',
    summary: 'Get landlord tenant details',
  })
  @ApiParam({ name: 'contractMemberId', type: String, format: 'uuid' })
  @ApiSuccessResponse({
    code: Code.FETCHED,
    dataDto: ContractTenantDetailResponseDto,
  })
  @ApiResponse({
    status: 404,
    description:
      'RESOURCE_NOT_FOUND for every absent, ineligible, deleted or foreign member',
  })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('contractMemberId', ParseUUIDPipe) contractMemberId: Uuid,
  ): Promise<ContractTenantDetailResponseDto> {
    const result = await this.queries.execute<
      ContractTenantGetByIdQuery,
      ContractTenantGetByIdResult
    >(new ContractTenantGetByIdQuery(user.id, contractMemberId));
    return ContractTenantDetailResponseDto.fromReadModel(result);
  }
}
