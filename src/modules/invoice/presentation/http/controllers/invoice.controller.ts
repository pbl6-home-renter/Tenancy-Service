import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvoiceGenerateCommand } from '../../../application/commands/invoice-generate/invoice-generate.command';
import { InvoiceGenerateResult } from '../../../application/commands/invoice-generate/invoice-generate.result';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { InvoiceGenerateRequestDto } from '../requests/invoice-generate.request.dto';
import { InvoiceGenerateResponseDto } from '../responses/invoice-generate.response.dto';

@ApiTags('Invoice')
@ApiBearerAuth()
@Roles(UserRole.LANDLORD)
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly commands: CommandBus) {}

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
}
