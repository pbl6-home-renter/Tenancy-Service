import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { ResponseCode } from 'shared/decorators/response-code.decorator';
import { ApiSuccessResponse } from 'shared/decorators/api-success-response.decorator';
import { Public } from 'shared/presentation/decorators/auth/access-control.decorators';
import { ServiceConstants } from 'config/service.constants';

@ApiTags('Health')
@Public()
@Controller(`${ServiceConstants.PATH}/health`)
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ResponseCode('HEALTH_CHECK_PASSED')
  @ApiOperation({ summary: 'Check service and database health' })
  @ApiSuccessResponse({
    code: 'HEALTH_CHECK_PASSED',
    description: 'Service is healthy',
  })
  async check(): Promise<{ status: 'ok'; database: 'connected' }> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch (error) {
      this.logger.error(
        'Database health check failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Database health check failed',
        },
        { cause: error },
      );
    }

    return { status: 'ok', database: 'connected' };
  }
}
