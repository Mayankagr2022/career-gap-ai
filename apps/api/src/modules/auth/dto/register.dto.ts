import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PASSWORD_MESSAGE, PASSWORD_PATTERN } from '../../../common/validation/password';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiProperty({ example: 'SecurePass@123' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password: string;
}
