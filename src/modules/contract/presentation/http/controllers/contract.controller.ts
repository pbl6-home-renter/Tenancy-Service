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
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { PaginatedResponseDto } from 'shared/presentation/pagination/paginated.response.dto';
import { ContractCreateCommand } from '../../../application/commands/contract-create/contract-create.command';
import { ContractUpdateCommand } from '../../../application/commands/contract-update/contract-update.command';
import { ContractGetByIdQuery } from '../../../application/queries/contract-get-by-id/contract-get-by-id.query';
import { ContractListQuery } from '../../../application/queries/contract-list/contract-list.query';
import { ContractListResult } from '../../../application/queries/contract-list/contract-list.result';
import { ContractEntity } from '../../../domain/entities/contract.entity';
import { ContractResponseCodeConstant } from '../constants/contract-response-code.constant';
import { CreateContractRequest } from '../requests/create-contract.request';
import { ListContractsQueryRequestDto } from '../requests/list-contracts.query.request.dto';
import { UpdateContractRequest } from '../requests/update-contract.request';
import { ContractCreateResponseDto } from '../responses/contract-create.response.dto';
import { ContractDetailResponseDto } from '../responses/contract-detail.response.dto';
import { ContractListItemResponseDto } from '../responses/contract-list-item.response.dto';
import { ContractUpdateResponseDto } from '../responses/contract-update.response.dto';

@ApiTags('Contract')
@ApiBearerAuth()
@Controller('contracts')
export class ContractController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.CREATED)
  @ResponseCode(ContractResponseCodeConstant.CONTRACT_CREATED)
  @ApiOperation({
    operationId: 'postContracts',
    summary: 'Create draft contract',
  })
  @ApiSuccessResponse({
    status: HttpStatus.CREATED,
    code: ContractResponseCodeConstant.CONTRACT_CREATED,
    dataDto: ContractCreateResponseDto,
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: CreateContractRequest,
  ): Promise<ContractCreateResponseDto> {
    const contract = await this.commandBus.execute<
      ContractCreateCommand,
      ContractEntity
    >(CreateContractRequest.toCommand(request, user.id));
    return ContractCreateResponseDto.fromDomain(contract);
  }

  @Get()
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(ContractResponseCodeConstant.CONTRACTS_FETCHED)
  @ApiOperation({ operationId: 'getContracts', summary: 'List my contracts' })
  @ApiResponse({ status: HttpStatus.OK })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() request: ListContractsQueryRequestDto,
  ): Promise<PaginatedResponseDto<ContractListItemResponseDto>> {
    const result = await this.queryBus.execute<
      ContractListQuery,
      PaginatedResult<ContractListResult>
    >(ListContractsQueryRequestDto.toQuery(request, user.id));
    return PaginatedResponseDto.create({
      data: result.data.map(ContractListItemResponseDto.fromReadModel),
      pagination: result.pagination,
    });
  }

  @Get(':contractId')
  @Roles(UserRole.LANDLORD, UserRole.TENANT)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(ContractResponseCodeConstant.CONTRACT_FETCHED)
  @ApiOperation({
    operationId: 'getContractsContractid',
    summary: 'Get contract details',
  })
  @ApiParam({ name: 'contractId', type: String, format: 'uuid' })
  @ApiSuccessResponse({
    code: ContractResponseCodeConstant.CONTRACT_FETCHED,
    dataDto: ContractDetailResponseDto,
  })
  async getById(
    @Param('contractId', ParseUUIDPipe) contractId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContractDetailResponseDto> {
    const contract = await this.queryBus.execute<
      ContractGetByIdQuery,
      ContractEntity
    >(new ContractGetByIdQuery(contractId, user));
    return ContractDetailResponseDto.fromDomain(contract);
  }

  @Patch(':contractId')
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(ContractResponseCodeConstant.CONTRACT_UPDATED)
  @ApiOperation({
    operationId: 'patchContractsContractid',
    summary: 'Update draft contract',
  })
  @ApiParam({ name: 'contractId', type: String, format: 'uuid' })
  @ApiSuccessResponse({
    code: ContractResponseCodeConstant.CONTRACT_UPDATED,
    dataDto: ContractUpdateResponseDto,
  })
  async update(
    @Param('contractId', ParseUUIDPipe) contractId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: UpdateContractRequest,
  ): Promise<ContractUpdateResponseDto> {
    const contract = await this.commandBus.execute<
      ContractUpdateCommand,
      ContractEntity
    >(UpdateContractRequest.toCommand(request, contractId, user.id));
    return ContractUpdateResponseDto.fromDomain(contract);
  }
}
