import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

@ApiSchema({ name: 'BuildingCreateRequestDto' })
export class CreateBuildingRequest {
  @ApiProperty({ minLength: 1, maxLength: 254, example: 'Nhà trọ Thanh Xuân' })
  @IsString()
  @Length(1, 254)
  name: string;

  @ApiProperty({
    minLength: 1,
    maxLength: 100,
    example: 'Thành phố Hồ Chí Minh',
  })
  @IsString()
  @Length(1, 100)
  province: string;

  @ApiProperty({ minLength: 1, maxLength: 100, example: 'Phường Bến Nghé' })
  @IsString()
  @Length(1, 100)
  ward: string;

  @ApiProperty({ minLength: 1, maxLength: 254, example: '12 Nguyễn Trãi' })
  @IsString()
  @Length(1, 254)
  address: string;
}
