import { ApiProperty } from '@nestjs/swagger';
import {
  MyRoommateProfileResult,
  PublicRoommateProfileResult,
} from '../../../application/roommate-profile.result';
import { RoommateLifestyle } from '../../../domain/roommate-profile.types';

export class MyRoommateProfileResponseDto implements MyRoommateProfileResult {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) tenantId: string;
  @ApiProperty() isVisible: boolean;
  @ApiProperty({ type: String, nullable: true }) bio: string | null;
  @ApiProperty({ type: String, nullable: true }) gender: string | null;
  @ApiProperty({ type: Number, nullable: true }) birthYear: number | null;
  @ApiProperty({ type: String, nullable: true }) occupation: string | null;
  @ApiProperty({ type: String, nullable: true }) preferredProvince:
    string | null;
  @ApiProperty({ type: String, nullable: true }) preferredDistrict:
    string | null;
  @ApiProperty({ type: String, nullable: true }) preferredArea: string | null;
  @ApiProperty({ type: Number, nullable: true }) budgetMin: number | null;
  @ApiProperty({ type: Number, nullable: true }) budgetMax: number | null;
  @ApiProperty({ type: String, format: 'date', nullable: true }) moveInOn:
    string | null;
  @ApiProperty({ type: Object, nullable: true })
  lifestyle: RoommateLifestyle | null;

  static fromReadModel(
    result: MyRoommateProfileResult,
  ): MyRoommateProfileResponseDto {
    const dto = new MyRoommateProfileResponseDto();
    dto.id = result.id;
    dto.tenantId = result.tenantId;
    dto.isVisible = result.isVisible;
    dto.bio = result.bio;
    dto.gender = result.gender;
    dto.birthYear = result.birthYear;
    dto.occupation = result.occupation;
    dto.preferredProvince = result.preferredProvince;
    dto.preferredDistrict = result.preferredDistrict;
    dto.preferredArea = result.preferredArea;
    dto.budgetMin = result.budgetMin;
    dto.budgetMax = result.budgetMax;
    dto.moveInOn = result.moveInOn;
    dto.lifestyle = result.lifestyle;
    return dto;
  }
}

export class PublicRoommateProfileResponseDto
  extends MyRoommateProfileResponseDto
  implements PublicRoommateProfileResult
{
  @ApiProperty() tenantName: string;
  @ApiProperty({ type: String, nullable: true }) avatarUrl: string | null;

  static fromReadModel(
    result: PublicRoommateProfileResult,
  ): PublicRoommateProfileResponseDto {
    const dto = Object.assign(
      new PublicRoommateProfileResponseDto(),
      MyRoommateProfileResponseDto.fromReadModel(result),
    );
    dto.tenantName = result.tenantName;
    dto.avatarUrl = result.avatarUrl;
    return dto;
  }
}
