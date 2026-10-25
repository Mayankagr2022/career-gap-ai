import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PASSWORD_MESSAGE, PASSWORD_PATTERN } from '../../../common/validation/password';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  newPassword: string;
}
