import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { PaginatedResponseDto } from 'shared/presentation/pagination/paginated.response.dto';
import { ContractTemplateGetQuery } from '../../../application/queries/contract-template-get/contract-template-get.query';
import { ContractTemplateListQuery } from '../../../application/queries/contract-template-list/contract-template-list.query';
import { ContractTemplateEntity } from '../../../domain/entities/contract-template.entity';
import { ContractResponseCodeConstant } from '../constants/contract-response-code.constant';
import { ContractTemplateListQueryRequestDto } from '../requests/contract-template-list.query.request.dto';
import { ContractTemplateDetailResponseDto } from '../responses/contract-template-detail.response.dto';
import { ContractTemplateListItemResponseDto } from '../responses/contract-template-list-item.response.dto';

@ApiTags('ContractTemplate')
@ApiBearerAuth()
@Roles(UserRole.LANDLORD)
@Controller('contract-templates')
export class ContractTemplateController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ResponseCode(ContractResponseCodeConstant.CONTRACT_TEMPLATES_FETCHED)
  @ApiOperation({
    operationId: 'getContractTemplates',
    summary: 'List active contract templates',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async list(
    @Query() request: ContractTemplateListQueryRequestDto,
  ): Promise<PaginatedResponseDto<ContractTemplateListItemResponseDto>> {
    const result = await this.queryBus.execute<
      ContractTemplateListQuery,
      PaginatedResult<ContractTemplateEntity>
    >(ContractTemplateListQueryRequestDto.toQuery(request));
    return PaginatedResponseDto.create({
      data: result.data.map(ContractTemplateListItemResponseDto.fromDomain),
      pagination: result.pagination,
    });
  }

  @Get(':templateKey')
  @HttpCode(HttpStatus.OK)
  @ResponseCode(ContractResponseCodeConstant.CONTRACT_TEMPLATE_FETCHED)
  @ApiOperation({
    operationId: 'getContractTemplatesTemplatekey',
    summary: 'Get active contract template',
  })
  @ApiParam({ name: 'templateKey', type: String })
  @ApiSuccessResponse({
    code: ContractResponseCodeConstant.CONTRACT_TEMPLATE_FETCHED,
    dataDto: ContractTemplateDetailResponseDto,
  })
  async getByKey(
    @Param('templateKey') templateKey: string,
  ): Promise<ContractTemplateDetailResponseDto> {
    const template = await this.queryBus.execute<
      ContractTemplateGetQuery,
      ContractTemplateEntity
    >(new ContractTemplateGetQuery(templateKey));
    return ContractTemplateDetailResponseDto.fromDomain(template);
  }
}
