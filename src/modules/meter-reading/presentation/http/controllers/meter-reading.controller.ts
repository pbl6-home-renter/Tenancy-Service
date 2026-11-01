import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { CurrentUser } from 'shared/presentation/decorators/auth/current-user.decorator';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { PaginatedResponseDto } from 'shared/presentation/pagination/paginated.response.dto';
import { MeterReadingCreateCommand } from '../../../application/commands/meter-reading-create/meter-reading-create.command';
import { MeterReadingBulkCreateCommand } from '../../../application/commands/meter-reading-bulk-create/meter-reading-bulk-create.command';
import { MeterReadingBulkCreateResult } from '../../../application/commands/meter-reading-bulk-create/meter-reading-bulk-create.result';
import { MeterReadingListQuery } from '../../../application/queries/meter-reading-list/meter-reading-list.query';
import { MeterReadingEntity } from '../../../domain/entities/meter-reading.entity';
import { MeterReadingResponseCodeConstant as Code } from '../constants/meter-reading-response-code.constant';
import { CreateMeterReadingRequest } from '../requests/create-meter-reading.request.dto';
import { BulkCreateMeterReadingsRequest } from '../requests/bulk-create-meter-readings.request.dto';
import { MeterReadingListRequest } from '../requests/meter-reading-list.request.dto';
import { MeterReadingResponseDto } from '../responses/meter-reading.response.dto';
import { BulkMeterReadingResponseDto } from '../responses/bulk-meter-reading.response.dto';

@ApiTags('MeterReading')
@ApiBearerAuth()
@Roles(UserRole.LANDLORD)
@Controller('meter-readings')
export class MeterReadingController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ResponseCode(Code.METER_READINGS_BULK_RECORDED)
  @ApiOperation({
    operationId: 'postBulkMeterReadings',
    summary: 'Record up to 200 meter readings atomically',
  })
  @ApiSuccessResponse({
    status: HttpStatus.CREATED,
    code: Code.METER_READINGS_BULK_RECORDED,
    dataDto: BulkMeterReadingResponseDto,
  })
  async createBulk(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: BulkCreateMeterReadingsRequest,
  ): Promise<BulkMeterReadingResponseDto> {
    const result = await this.commands.execute<
      MeterReadingBulkCreateCommand,
      MeterReadingBulkCreateResult
    >(request.toCommand(user.id));
    return BulkMeterReadingResponseDto.fromResult(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseCode(Code.METER_READING_CREATED)
  @ApiOperation({
    operationId: 'postMeterReadings',
    summary: 'Record a meter reading',
  })
  @ApiSuccessResponse({
    status: HttpStatus.CREATED,
    code: Code.METER_READING_CREATED,
    dataDto: MeterReadingResponseDto,
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: CreateMeterReadingRequest,
  ): Promise<MeterReadingResponseDto> {
    const reading = await this.commands.execute<
      MeterReadingCreateCommand,
      MeterReadingEntity
    >(CreateMeterReadingRequest.toCommand(request, user.id));
    return MeterReadingResponseDto.fromDomain(reading);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ResponseCode(Code.METER_READINGS_FETCHED)
  @ApiOperation({
    operationId: 'getMeterReadings',
    summary: 'List meter readings',
  })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() request: MeterReadingListRequest,
  ): Promise<PaginatedResponseDto<MeterReadingResponseDto>> {
    const result = await this.queries.execute<
      MeterReadingListQuery,
      PaginatedResult<MeterReadingEntity>
    >(new MeterReadingListQuery(user.id, request));
    return PaginatedResponseDto.create({
      data: result.data.map(MeterReadingResponseDto.fromDomain),
      pagination: result.pagination,
    });
  }
}
