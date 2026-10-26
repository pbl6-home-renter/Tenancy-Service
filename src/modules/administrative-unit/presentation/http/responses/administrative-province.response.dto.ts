import { ApiProperty } from '@nestjs/swagger';
import type { AdministrativeProvince } from '../../../domain/reference-data/administrative-province';

export class AdministrativeProvinceResponseDto {
  @ApiProperty({ example: '01' })
  code: string;

  @ApiProperty({ example: 'Thành phố Hà Nội' })
  name: string;

  @ApiProperty({ example: 'thành phố trung ương' })
  divisionType: string;

  static fromModel(
    model: AdministrativeProvince,
  ): AdministrativeProvinceResponseDto {
    const dto = new AdministrativeProvinceResponseDto();
    dto.code = model.code;
    dto.name = model.name;
    dto.divisionType = model.divisionType;
    return dto;
  }
}
