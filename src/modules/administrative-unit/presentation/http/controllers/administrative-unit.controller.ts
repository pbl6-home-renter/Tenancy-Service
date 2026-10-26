import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'shared/presentation/decorators/api-success-response.decorator';
import { Public } from 'shared/presentation/decorators/auth/access-control.decorators';
import { ResponseCode } from 'shared/presentation/decorators/response-code.decorator';
import { AdministrativeUnitService } from '../../../application/administrative-unit.service';
import { AdministrativeUnitResponseCodeConstant as Codes } from '../constants/administrative-unit-response-code.constant';
import { AdministrativeProvinceResponseDto } from '../responses/administrative-province.response.dto';
import { AdministrativeWardResponseDto } from '../responses/administrative-ward.response.dto';

@ApiTags('Administrative Units')
@Public()
@Controller('administrative-units')
export class AdministrativeUnitController {
  constructor(private readonly service: AdministrativeUnitService) {}

  @Get('provinces')
  @HttpCode(HttpStatus.OK)
  @ResponseCode(Codes.PROVINCES_FETCHED)
  @ApiOperation({
    operationId: 'getAdministrativeProvinces',
    summary: 'List Vietnamese provinces',
  })
  @ApiSuccessResponse({
    code: Codes.PROVINCES_FETCHED,
    dataDto: AdministrativeProvinceResponseDto,
  })
  getProvinces(): AdministrativeProvinceResponseDto[] {
    return this.service
      .listProvinces()
      .map(AdministrativeProvinceResponseDto.fromModel);
  }

  @Get('provinces/:provinceCode/wards')
  @HttpCode(HttpStatus.OK)
  @ResponseCode(Codes.WARDS_FETCHED)
  @ApiOperation({
    operationId: 'getAdministrativeWards',
    summary: 'List wards of a Vietnamese province',
  })
  @ApiParam({
    name: 'provinceCode',
    example: '01',
    description: 'One- or two-digit province code',
  })
  @ApiSuccessResponse({
    code: Codes.WARDS_FETCHED,
    dataDto: AdministrativeWardResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'PROVINCE_NOT_FOUND',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'INVALID_PROVINCE_CODE',
  })
  getWards(
    @Param('provinceCode') provinceCode: string,
  ): AdministrativeWardResponseDto[] {
    return this.service
      .listWardsByProvince(provinceCode)
      .map(AdministrativeWardResponseDto.fromModel);
  }
}
