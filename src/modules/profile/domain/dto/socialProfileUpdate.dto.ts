import {
  IsString,
  Matches,
  IsOptional,
  IsNotEmpty, IsDefined, IsUUID, IsEnum
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SocialType } from "../entity/socialProfile.entity";

export class SocialProfileUpdateDto {
  // @IsNotEmpty({ message: 'Id must not empty' })
  // @IsDefined({ message: 'Id must be defined' })
  // @IsUUID("all", { message: 'Id must be valid UUID'})
  // @ApiProperty()
  // id: string;

  @IsNotEmpty({ message: 'SocialType must not empty' })
  @IsDefined({ message: 'SocialType must be defined' })
  @IsEnum(SocialType, { message: `SocialType must one of these values, ${Object.keys(SocialType).toString()}` } )
  @ApiProperty()
  socialType: SocialType

  @IsNotEmpty({ message: 'Username must not empty' })
  @IsString({ message: 'Username must be string' })
  @IsOptional()
  @ApiPropertyOptional()
  username: string;

  @IsNotEmpty({ message: 'ProfileName must not empty' })
  @IsString({ message: 'ProfileName must be string' })
  @IsOptional()
  @ApiPropertyOptional()
  socialName: string

  @Matches(/(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/,
    { message: 'ProfileUrl must be valid url'})
  @IsOptional()
  @ApiPropertyOptional()
  profileUrl: string

  @Matches(/(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/,
    { message: 'Website must be valid url'})
  @IsOptional()
  @ApiPropertyOptional()
  website: string

  @IsString({ message: 'Location must be string' })
  @IsOptional()
  @ApiPropertyOptional()
  location: string
}
