import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ReviewBuildingRequest {
  static readonly unexpectedFieldCode = 'VALIDATION_FAILED';

  @ApiProperty({ minLength: 1, maxLength: 500 })
  @IsString()
  note: string;
}
