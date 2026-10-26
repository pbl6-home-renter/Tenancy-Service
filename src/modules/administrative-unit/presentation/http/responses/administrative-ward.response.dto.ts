import { ApiProperty } from '@nestjs/swagger';
import type { AdministrativeWard } from '../../../domain/reference-data/administrative-ward';

export class AdministrativeWardResponseDto {
  @ApiProperty({ example: '00004' })
  code: string;

  @ApiProperty({ example: '01' })
  provinceCode: string;

  @ApiProperty({ example: 'Phường Ba Đình' })
  name: string;

  @ApiProperty({ example: 'phường' })
  divisionType: string;

  static fromModel(model: AdministrativeWard): AdministrativeWardResponseDto {
    const dto = new AdministrativeWardResponseDto();
    dto.code = model.code;
    dto.provinceCode = model.provinceCode;
    dto.name = model.name;
    dto.divisionType = model.divisionType;
    return dto;
  }
}
