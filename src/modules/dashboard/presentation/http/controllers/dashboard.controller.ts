import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { Roles } from 'shared/presentation/decorators/auth/access-control.decorators';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { AdminDashboardQuery } from '../../../application/queries/admin-dashboard/admin-dashboard.query';
import { AdminDashboardResult } from '../../../application/queries/admin-dashboard/admin-dashboard.result';
import { DashboardResponseDto } from '../responses/dashboard.response.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ResponseCode('DASHBOARD_FETCHED')
  @ApiOperation({
    operationId: 'getDashboard',
    summary: 'Get admin building and room statistics',
  })
  @ApiSuccessResponse({
    code: 'DASHBOARD_FETCHED',
    dataDto: DashboardResponseDto,
  })
  async get(): Promise<DashboardResponseDto> {
    return this.queryBus.execute<AdminDashboardQuery, AdminDashboardResult>(
      new AdminDashboardQuery(),
    );
  }
}
