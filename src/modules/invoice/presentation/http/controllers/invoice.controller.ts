import {
  Body,
  Controller,
  Get,
  Headers,
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
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { InvoiceCancelCommand } from '../../../application/commands/invoice-cancel/invoice-cancel.command';
import { InvoiceGenerateCommand } from '../../../application/commands/invoice-generate/invoice-generate.command';
import { InvoiceGenerateResult } from '../../../application/commands/invoice-generate/invoice-generate.result';
import { InvoiceIssueCommand } from '../../../application/commands/invoice-issue/invoice-issue.command';
import { InvoiceIssueResult } from '../../../application/commands/invoice-issue/invoice-issue.result';
import { InvoiceUpdateCommand } from '../../../application/commands/invoice-update/invoice-update.command';
import {
  InvoiceDetailView,
  InvoiceListView,
} from '../../../application/ports/invoice-read.port';
import { InvoiceDetailQuery } from '../../../application/queries/invoice-detail/invoice-detail.query';
import { InvoiceListQuery } from '../../../application/queries/invoice-list/invoice-list.query';
import { InvoiceEntity } from '../../../domain/entities/invoice.entity';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { PaginatedResponseDto } from 'shared/presentation/pagination/paginated.response.dto';
import { InvoiceCancelRequestDto } from '../requests/invoice-cancel.request.dto';
import { InvoiceGenerateRequestDto } from '../requests/invoice-generate.request.dto';
import { InvoiceIssueRequestDto } from '../requests/invoice-issue.request.dto';
import { InvoiceListRequest } from '../requests/invoice-list.request.dto';
import { InvoiceUpdateRequestDto } from '../requests/invoice-update.request.dto';
import { InvoiceCancelResponseDto } from '../responses/invoice-cancel.response.dto';
import { InvoiceDetailResponseDto } from '../responses/invoice-detail.response.dto';
import { InvoiceGenerateResponseDto } from '../responses/invoice-generate.response.dto';
import { InvoiceIssueResponseDto } from '../responses/invoice-issue.response.dto';
import { InvoiceListResponseDto } from '../responses/invoice-list.response.dto';
import { InvoiceUpdateResponseDto } from '../responses/invoice-update.response.dto';
import { InvoiceTenantDetailResponseDto } from '../responses/invoice-tenant-detail.response.dto';

@ApiTags('Invoice')
@ApiBearerAuth()
@Roles(UserRole.LANDLORD)
@Controller('invoices')
export class InvoiceController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ResponseCode('INVOICES_GENERATED')
  @ApiOperation({
    operationId: 'postInvoicesGenerate',
    summary:
      'Generate or recalculate pending invoices for a building and period',
  })
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    code: 'INVOICES_GENERATED',
    dataDto: InvoiceGenerateResponseDto,
  })
  async generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: InvoiceGenerateRequestDto,
  ): Promise<InvoiceGenerateResponseDto> {
    const result = await this.commands.execute<
      InvoiceGenerateCommand,
      InvoiceGenerateResult
    >(request.toCommand(user.id));
    return InvoiceGenerateResponseDto.fromResult(result);
  }

  @Post('issue-invoice')
  @HttpCode(HttpStatus.OK)
  @ResponseCode('INVOICES_ISSUE_REQUESTED')
  @ApiOperation({
    operationId: 'postInvoicesIssueInvoice',
    summary: 'Issue invoices',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'UUID identifying this batch request for 24-hour replay',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    code: 'INVOICES_ISSUE_REQUESTED',
    dataDto: InvoiceIssueResponseDto,
  })
  async issue(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') key: string | undefined,
    @Body() request: InvoiceIssueRequestDto,
  ): Promise<InvoiceIssueResponseDto> {
    const result = await this.commands.execute<
      InvoiceIssueCommand,
      InvoiceIssueResult
    >(request.toCommand(user.id, key));
    return InvoiceIssueResponseDto.fromResult(result);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ResponseCode('INVOICES_FETCHED')
  @ApiOperation({
    operationId: 'getInvoices',
    summary: 'List landlord invoices',
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() request: InvoiceListRequest,
  ): Promise<PaginatedResponseDto<InvoiceListResponseDto>> {
    const result = await this.queries.execute<
      InvoiceListQuery,
      PaginatedResult<InvoiceListView>
    >(new InvoiceListQuery(user.id, request));
    return PaginatedResponseDto.create({
      data: result.data.map(InvoiceListResponseDto.fromView),
      pagination: result.pagination,
    });
  }

  @Get(':invoiceId')
  @Roles(UserRole.LANDLORD, UserRole.TENANT)
  @HttpCode(HttpStatus.OK)
  @ResponseCode('INVOICE_FETCHED')
  @ApiOperation({
    operationId: 'getInvoicesInvoiceid',
    summary: 'Get invoice detail',
  })
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    code: 'INVOICE_FETCHED',
    dataDto: InvoiceDetailResponseDto,
  })
  async detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: Uuid,
  ): Promise<InvoiceDetailResponseDto | InvoiceTenantDetailResponseDto> {
    const view = await this.queries.execute<
      InvoiceDetailQuery,
      InvoiceDetailView
    >(new InvoiceDetailQuery(invoiceId, user.id, user.role));
    return user.role === UserRole.TENANT
      ? InvoiceTenantDetailResponseDto.fromView(view)
      : InvoiceDetailResponseDto.fromView(view);
  }

  @Patch(':invoiceId')
  @HttpCode(HttpStatus.OK)
  @ResponseCode('INVOICE_UPDATED')
  @ApiOperation({
    operationId: 'patchInvoicesInvoiceid',
    summary: 'Update pending invoice',
  })
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    code: 'INVOICE_UPDATED',
    dataDto: InvoiceUpdateResponseDto,
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: Uuid,
    @Body() request: InvoiceUpdateRequestDto,
  ): Promise<InvoiceUpdateResponseDto> {
    const invoice = await this.commands.execute<
      InvoiceUpdateCommand,
      InvoiceEntity
    >(request.toCommand(invoiceId, user.id));
    return InvoiceUpdateResponseDto.fromDomain(invoice);
  }

  @Post(':invoiceId/cancel-invoice')
  @HttpCode(HttpStatus.OK)
  @ResponseCode('INVOICE_CANCELLED')
  @ApiOperation({
    operationId: 'postInvoicesInvoiceidCancelInvoice',
    summary: 'Void invoice',
  })
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    code: 'INVOICE_CANCELLED',
    dataDto: InvoiceCancelResponseDto,
  })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: Uuid,
    @Body() request: InvoiceCancelRequestDto,
  ): Promise<InvoiceCancelResponseDto> {
    const invoice = await this.commands.execute<
      InvoiceCancelCommand,
      InvoiceEntity
    >(request.toCommand(invoiceId, user.id));
    return InvoiceCancelResponseDto.fromDomain(invoice);
  }
}
