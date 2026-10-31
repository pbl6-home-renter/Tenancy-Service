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
  Res,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { PaginatedResponseDto } from 'shared/presentation/pagination/paginated.response.dto';
import { BillingSettingCreateCommand } from '../../../application/commands/billing-setting-create/billing-setting-create.command';
import { BillingSettingUpdateCommand } from '../../../application/commands/billing-setting-update/billing-setting-update.command';
import { BillingSettingListQuery } from '../../../application/queries/billing-setting-list/billing-setting-list.query';
import { BillingSettingEntity } from '../../../domain/entities/billing-setting.entity';
import { BillingSettingResponseCodeConstant as Code } from '../constants/billing-setting-response-code.constant';
import { BillingSettingListRequest } from '../requests/billing-setting-list.request.dto';
import { CreateBillingSettingRequest } from '../requests/create-billing-setting.request.dto';
import { UpdateBillingSettingRequest } from '../requests/update-billing-setting.request.dto';
import { BillingSettingResponseDto } from '../responses/billing-setting.response.dto';

@ApiTags('BillingSetting')
@ApiBearerAuth()
@Roles(UserRole.LANDLORD)
@Controller('billing-settings')
export class BillingSettingController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ResponseCode(Code.BILLING_SETTINGS_FETCHED)
  @ApiOperation({
    operationId: 'getBillingSettings',
    summary: 'List billing settings',
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() request: BillingSettingListRequest,
  ): Promise<PaginatedResponseDto<BillingSettingResponseDto>> {
    const result = await this.queries.execute<
      BillingSettingListQuery,
      PaginatedResult<BillingSettingEntity>
    >(new BillingSettingListQuery(user.id, request));
    return PaginatedResponseDto.create({
      data: result.data.map(BillingSettingResponseDto.fromDomain),
      pagination: result.pagination,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseCode(Code.BILLING_SETTING_CREATED)
  @ApiOperation({
    operationId: 'postBillingSettings',
    summary: 'Create billing setting',
  })
  @ApiSuccessResponse({
    status: HttpStatus.CREATED,
    code: Code.BILLING_SETTING_CREATED,
    dataDto: BillingSettingResponseDto,
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: CreateBillingSettingRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<BillingSettingResponseDto> {
    const setting = await this.commands.execute<
      BillingSettingCreateCommand,
      BillingSettingEntity
    >(CreateBillingSettingRequest.toCommand(request, user.id));
    response.location(`/api/v1/billing-settings/${setting.id}`);
    return BillingSettingResponseDto.fromDomain(setting);
  }

  @Patch(':billingSettingId')
  @HttpCode(HttpStatus.OK)
  @ResponseCode(Code.BILLING_SETTING_UPDATED)
  @ApiOperation({
    operationId: 'patchBillingSettingsBillingsettingid',
    summary: 'Update billing setting',
  })
  @ApiSuccessResponse({
    code: Code.BILLING_SETTING_UPDATED,
    dataDto: BillingSettingResponseDto,
  })
  async update(
    @Param('billingSettingId', ParseUUIDPipe) id: Uuid,
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: UpdateBillingSettingRequest,
  ): Promise<BillingSettingResponseDto> {
    const setting = await this.commands.execute<
      BillingSettingUpdateCommand,
      BillingSettingEntity
    >(UpdateBillingSettingRequest.toCommand(request, id, user.id));
    return BillingSettingResponseDto.fromDomain(setting);
  }
}
