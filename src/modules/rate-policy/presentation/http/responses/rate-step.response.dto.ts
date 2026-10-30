import { ApiProperty } from '@nestjs/swagger';

export class RateStepResponseDto {
  @ApiProperty({ type: 'integer' })
  from: number;

  @ApiProperty({ type: 'integer', nullable: true })
  to: number | null;

  @ApiProperty({ type: String })
  price: string;
}
