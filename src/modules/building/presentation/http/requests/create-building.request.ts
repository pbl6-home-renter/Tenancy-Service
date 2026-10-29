import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BuildingCreateCommand } from '../../../application/commands/building-create/building-create.command';

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

  static toCommand(
    request: CreateBuildingRequest,
    landlordId: Uuid,
  ): BuildingCreateCommand {
    return new BuildingCreateCommand(
      landlordId,
      request.name,
      request.province,
      request.ward,
      request.address,
    );
  }
}
