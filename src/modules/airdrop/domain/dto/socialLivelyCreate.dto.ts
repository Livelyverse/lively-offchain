import {
  IsString,
  Matches,
  IsOptional,
  IsNotEmpty,
  IsDefined,
  IsEnum
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SocialType } from "../../../profile/domain/entity/socialProfile.entity";

export class SocialLivelyCreateDto {
  @IsNotEmpty({ message: 'Username must not empty' })
  @IsDefined({ message: 'Username must be defined' })
  @IsString({ message: 'Username must be string' })
  @ApiProperty()
  username: string;

  @IsNotEmpty({ message: 'SocialType must not empty' })
  @IsDefined({ message: 'SocialType must be defined' })
  @IsEnum(SocialType, { message: `SocialType must one of these values, ${Object.keys(SocialType).toString()}` } )
  @ApiProperty()
  socialType: SocialType

  @IsNotEmpty({ message: 'UserId must not empty' })
  @IsString({ message: 'UserId must be string' })
  @IsOptional()
  @ApiPropertyOptional()
  userId?: string

  @IsNotEmpty({ message: 'ProfileName must not empty' })
  @IsDefined({ message: 'ProfileName must be defined' })
  @IsString({ message: 'ProfileName must be string' })
  @ApiProperty()
  profileName: string

  @Matches(/(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/,
    { message: 'ProfileUrl must be valid url'})
  @IsOptional()
  @ApiPropertyOptional()
  profileUrl?: string
}
