import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { PaginatedResponseDto } from 'shared/presentation/pagination/paginated.response.dto';
import { InvoiceMyListView } from '../../../application/ports/invoice-read.port';
import { InvoiceMyListQuery } from '../../../application/queries/invoice-my-list/invoice-my-list.query';
import { InvoiceMyListRequest } from '../requests/invoice-my-list.request.dto';
import { InvoiceMyListResponseDto } from '../responses/invoice-my-list.response.dto';

@ApiTags('Invoice')
@ApiBearerAuth()
@Controller()
export class InvoiceMyController {
  constructor(private readonly queries: QueryBus) {}

  @Get('me/invoices')
  @Roles(UserRole.TENANT)
  @HttpCode(HttpStatus.OK)
  @ResponseCode('INVOICES_MY_FETCHED')
  @ApiOperation({
    operationId: 'getMeInvoices',
    summary: 'List my issued invoices',
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() request: InvoiceMyListRequest,
  ): Promise<PaginatedResponseDto<InvoiceMyListResponseDto>> {
    const result = await this.queries.execute<
      InvoiceMyListQuery,
      PaginatedResult<InvoiceMyListView>
    >(new InvoiceMyListQuery(user.id, request));
    return PaginatedResponseDto.create({
      data: result.data.map(InvoiceMyListResponseDto.fromView),
      pagination: result.pagination,
    });
  }
}
