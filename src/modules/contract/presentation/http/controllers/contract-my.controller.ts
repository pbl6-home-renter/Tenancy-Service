import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { PaginatedResponseDto } from 'shared/presentation/pagination/paginated.response.dto';
import { ContractMyListQuery } from '../../../application/queries/contract-my-list/contract-my-list.query';
import { ContractMyListResult } from '../../../domain/repositories/contract-read.repository';
import { ContractResponseCodeConstant } from '../constants/contract-response-code.constant';
import { ListMyContractsQueryRequestDto } from '../requests/list-my-contracts.query.request.dto';
import { ContractMyListResponseDto } from '../responses/contract-my-list.response.dto';

@ApiTags('Contract')
@ApiBearerAuth()
@Controller()
export class ContractMyController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('me/contracts')
  @Roles(UserRole.TENANT)
  @HttpCode(HttpStatus.OK)
  @ResponseCode(ContractResponseCodeConstant.CONTRACTS_MY_FETCHED)
  @ApiOperation({
    operationId: 'getMeContracts',
    summary: 'List my contracts',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() request: ListMyContractsQueryRequestDto,
  ): Promise<PaginatedResponseDto<ContractMyListResponseDto>> {
    const result = await this.queryBus.execute<
      ContractMyListQuery,
      PaginatedResult<ContractMyListResult>
    >(ListMyContractsQueryRequestDto.toQuery(request, user.id));
    return PaginatedResponseDto.create({
      data: result.data.map(ContractMyListResponseDto.fromReadModel),
      pagination: result.pagination,
    });
  }
}
