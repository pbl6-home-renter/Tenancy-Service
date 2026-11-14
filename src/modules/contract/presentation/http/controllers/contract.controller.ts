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
  Put,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiProduces,
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
import { ContractActivateCommand } from '../../../application/commands/contract-activate/contract-activate.command';
import { ContractCreateCommand } from '../../../application/commands/contract-create/contract-create.command';
import { ContractUpdateCommand } from '../../../application/commands/contract-update/contract-update.command';
import { ContractTemplateApplyCommand } from '../../../application/commands/contract-template-apply/contract-template-apply.command';
import { ContractCheckoutCompleteCommand } from '../../../application/commands/contract-checkout-complete/contract-checkout-complete.command';
import { ContractGetByIdQuery } from '../../../application/queries/contract-get-by-id/contract-get-by-id.query';
import { ContractListQuery } from '../../../application/queries/contract-list/contract-list.query';
import { ContractListResult } from '../../../application/queries/contract-list/contract-list.result';
import { ContractDraftDocumentGenerateQuery } from '../../../application/queries/contract-draft-document-generate/contract-draft-document-generate.query';
import { DraftDocument } from '../../../application/queries/contract-draft-document-generate/contract-draft-document-generate.query.handler';
import { ContractEntity } from '../../../domain/entities/contract.entity';
import { ContractResponseCodeConstant } from '../constants/contract-response-code.constant';
import { ActivateContractRequest } from '../requests/activate-contract.request';
import { CreateContractRequest } from '../requests/create-contract.request';
import { ListContractsQueryRequestDto } from '../requests/list-contracts.query.request.dto';
import { UpdateContractRequest } from '../requests/update-contract.request';
import { ApplyContractTemplateRequest } from '../requests/apply-contract-template.request';
import { CompleteContractCheckoutRequest } from '../requests/complete-contract-checkout.request';
import { ContractActivateResponseDto } from '../responses/contract-activate.response.dto';
import { ContractCreateResponseDto } from '../responses/contract-create.response.dto';
import { ContractDetailResponseDto } from '../responses/contract-detail.response.dto';
import { ContractListItemResponseDto } from '../responses/contract-list-item.response.dto';
import { ContractUpdateResponseDto } from '../responses/contract-update.response.dto';
import { ContractCheckoutCompleteResponseDto } from '../responses/contract-checkout-complete.response.dto';

@ApiTags('Contract')
@ApiBearerAuth()
@Controller('contracts')
export class ContractController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) { }

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

  @Post(':contractId/generate-draft-document')
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'postContractsContractidGenerateDraftDocument',
    summary: 'Generate a draft contract PDF',
  })
  @ApiParam({ name: 'contractId', type: String, format: 'uuid' })
  @ApiProduces('application/pdf')
  @ApiResponse({
    status: HttpStatus.OK,
    schema: { type: 'string', format: 'binary' },
  })
  async generateDraftDocument(
    @Param('contractId', ParseUUIDPipe) contractId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StreamableFile> {
    const document = await this.queryBus.execute<
      ContractDraftDocumentGenerateQuery,
      DraftDocument
    >(new ContractDraftDocumentGenerateQuery(contractId, user.id));
    return new StreamableFile(document.data, {
      type: 'application/pdf',
      disposition: `attachment; filename="${document.filename}"`,
    });
  }

  @Put(':contractId/apply-template')
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(ContractResponseCodeConstant.CONTRACT_TEMPLATE_APPLIED)
  @ApiOperation({
    operationId: 'putContractsContractidApplyTemplate',
    summary: 'Apply a template to a draft contract',
  })
  @ApiParam({ name: 'contractId', type: String, format: 'uuid' })
  @ApiSuccessResponse({
    code: ContractResponseCodeConstant.CONTRACT_TEMPLATE_APPLIED,
    dataDto: ContractDetailResponseDto,
  })
  async applyTemplate(
    @Param('contractId', ParseUUIDPipe) contractId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: ApplyContractTemplateRequest,
  ): Promise<ContractDetailResponseDto> {
    const contract = await this.commandBus.execute<
      ContractTemplateApplyCommand,
      ContractEntity
    >(
      new ContractTemplateApplyCommand(
        contractId,
        user.id,
        request.templateKey,
      ),
    );
    return ContractDetailResponseDto.fromDomain(contract);
  }

  @Patch(':contractId')
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(ContractResponseCodeConstant.CONTRACT_UPDATED)
  @ApiOperation({
    operationId: 'patchContractsContractid',
    summary: 'Update draft or active contract',
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

  @Post(':contractId/activate-contract')
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(ContractResponseCodeConstant.CONTRACT_ACTIVATED)
  @ApiOperation({
    operationId: 'postContractsContractidActivateContract',
    summary: 'Activate signed contract',
  })
  @ApiParam({ name: 'contractId', type: String, format: 'uuid' })
  @ApiSuccessResponse({
    code: ContractResponseCodeConstant.CONTRACT_ACTIVATED,
    dataDto: ContractActivateResponseDto,
  })
  async activate(
    @Param('contractId', ParseUUIDPipe) contractId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: ActivateContractRequest,
  ): Promise<ContractActivateResponseDto> {
    const contract = await this.commandBus.execute<
      ContractActivateCommand,
      ContractEntity
    >(ActivateContractRequest.toCommand(request, contractId, user.id));
    return ContractActivateResponseDto.fromDomain(contract);
  }

  @Post(':contractId/complete-checkout')
  @Roles(UserRole.LANDLORD)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(ContractResponseCodeConstant.CONTRACT_CHECKOUT_COMPLETED)
  @ApiOperation({
    operationId: 'postContractsContractidCompleteCheckout',
    summary: 'Complete contract checkout',
  })
  @ApiParam({ name: 'contractId', type: String, format: 'uuid' })
  @ApiSuccessResponse({
    code: ContractResponseCodeConstant.CONTRACT_CHECKOUT_COMPLETED,
    dataDto: ContractCheckoutCompleteResponseDto,
  })
  async completeCheckout(
    @Param('contractId', ParseUUIDPipe) contractId: Uuid,
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: CompleteContractCheckoutRequest,
  ): Promise<ContractCheckoutCompleteResponseDto> {
    const contract = await this.commandBus.execute<
      ContractCheckoutCompleteCommand,
      ContractEntity
    >(CompleteContractCheckoutRequest.toCommand(request, contractId, user.id));
    return ContractCheckoutCompleteResponseDto.fromDomain(
      contract,
      request.completedOn,
    );
  }
}
