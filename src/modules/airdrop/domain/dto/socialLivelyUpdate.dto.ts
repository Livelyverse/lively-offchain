import {
  IsString,
  Matches,
  IsOptional,
  IsNotEmpty,
  IsDefined,
  IsUUID
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SocialLivelyUpdateDto {
  @IsNotEmpty({ message: 'Id must not empty' })
  @IsDefined({ message: 'Id must be defined' })
  @IsUUID("all", { message: 'Id must be valid UUID'})
  @ApiProperty()
  id: string;

  @IsNotEmpty({ message: 'Username must not empty' })
  @IsString({ message: 'Username must be string' })
  @IsOptional()
  @ApiPropertyOptional()
  username?: string;

  @IsNotEmpty({ message: 'UserId must not empty' })
  @IsString({ message: 'UserId must be string' })
  @IsOptional()
  @ApiPropertyOptional()
  userId?: string

  @IsNotEmpty({ message: 'ProfileName must not empty' })
  @IsString({ message: 'ProfileName must be string' })
  @IsOptional()
  @ApiPropertyOptional()
  profileName?: string

  @Matches(/(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/,
    { message: 'ProfileUrl must be valid url'})
  @IsOptional()
  @ApiPropertyOptional()
  profileUrl?: string
}
