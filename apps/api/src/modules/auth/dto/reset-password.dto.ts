import { IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PASSWORD_MESSAGE, PASSWORD_PATTERN } from '../../../common/validation/password';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(20)
  token: string;

  @ApiProperty({ example: 'SecurePass@123' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password: string;
}
