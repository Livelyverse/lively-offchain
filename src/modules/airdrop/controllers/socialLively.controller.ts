import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UsePipes, ValidationPipe
} from "@nestjs/common";
import { SocialLivelyService, SocialLivelySortBy } from "../services/socialLively.service";
import * as RxJS from "rxjs";
import { ApiBearerAuth, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import RoleGuard from "../../authentication/domain/gurad/role.guard";
import { JwtAuthGuard } from "../../authentication/domain/gurad/jwt-auth.guard";
import { SocialLivelyCreateDto } from "../domain/dto/socialLivelyCreate.dto";
import { SocialLivelyUpdateDto } from "../domain/dto/socialLivelyUpdate.dto";
import { SocialLivelyViewDto } from "../domain/dto/socialLivelyView.dto";
import { FindAllViewDto } from "../domain/dto/findAllView.dto";
import { FindAllType, SortType } from "../services/IAirdrop.service";
import { PaginationPipe } from "../domain/pipe/paginationPipe";
import { SocialLivelyEntity } from "../domain/entity/socialLively.entity";
import { SocialType } from "../../profile/domain/entity/socialProfile.entity";
import { EnumPipe } from "../domain/pipe/enumPipe";


@ApiBearerAuth()
@ApiTags('/api/airdrops/socials/profiles')
@Controller('/api/airdrops/socials/profiles')
export class SocialLivelyController {

  private readonly _logger = new Logger(SocialLivelyController.name);
  constructor(private readonly _socialLivelyService: SocialLivelyService) {}

  @Post('create')
  @UsePipes(new ValidationPipe({
    transform: true,
    skipMissingProperties: true,
    validationError: { target: false }
  }))
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard('ADMIN'))
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Record Created Successfully.',
    type: SocialLivelyViewDto
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 417, description: 'Auth Token Expired.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  socialLivelyCreate(@Body() socialLivelyDto: SocialLivelyCreateDto): RxJS.Observable<SocialLivelyViewDto> {
    return RxJS.from(this._socialLivelyService.create(socialLivelyDto)).pipe(
      RxJS.map(entity => SocialLivelyViewDto.from(entity)),
      RxJS.tap({
        error: err => this._logger.error(`socialLivelyCreate failed, dto: ${socialLivelyDto}`, err)
      }),
      RxJS.catchError(error =>
        RxJS.merge(
          RxJS.of(error).pipe(
            RxJS.filter(err => err instanceof HttpException),
            RxJS.mergeMap(err => RxJS.throwError(err)),
          ),
          RxJS.of(error).pipe(
            RxJS.filter(err => !(err instanceof HttpException)),
            RxJS.mergeMap(err =>
              RxJS.throwError(() => new HttpException(
                {
                  statusCode: '500',
                  message: 'Something Went Wrong',
                  error: 'Internal Server Error'
                }, HttpStatus.INTERNAL_SERVER_ERROR)
              )
            )
          )
        )
      ),
    )
  }

  @Post('update')
  @UsePipes(new ValidationPipe({
    transform: true,
    skipMissingProperties: true,
    validationError: { target: false }
  }))
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Record Updated Successfully.',
    type: SocialLivelyViewDto
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Record Not Found.' })
  @ApiResponse({ status: 417, description: 'Auth Token Expired.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  socialLivelyUpdate(@Body() socialLivelyDto: SocialLivelyUpdateDto): RxJS.Observable<SocialLivelyViewDto> {

    return RxJS.from(this._socialLivelyService.update(socialLivelyDto)).pipe(
      RxJS.map(entity => SocialLivelyViewDto.from(entity)),
      RxJS.tap({
        error: err => this._logger.error(`socialLivelyUpdate failed, dto: ${socialLivelyDto}`, err)
      }),
      RxJS.catchError(error =>
        RxJS.merge(
          RxJS.of(error).pipe(
            RxJS.filter(err => err instanceof HttpException),
            RxJS.mergeMap(err => RxJS.throwError(err)),
          ),
          RxJS.of(error).pipe(
            RxJS.filter(err => !(err instanceof HttpException)),
            RxJS.mergeMap(err =>
              RxJS.throwError(() => new HttpException(
                {
                  statusCode: '500',
                  message: 'Something Went Wrong',
                  error: 'Internal Server Error'
                }, HttpStatus.INTERNAL_SERVER_ERROR)
              )
            )
          )
        )
      ),
    )
  }

  @Get('/find/all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard('ADMIN'))
  @UseGuards(JwtAuthGuard)
  @ApiQuery({
    name: 'page',
    required: true,
    description: 'data page',
    schema: { type: 'number' },
  })
  @ApiQuery({
    name: 'offset',
    required: true,
    description: 'data offset',
    schema: { type: 'number' },
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: `data sort field can be one of ${Object.keys(SocialLivelySortBy)}`,
    schema: { enum: Object.keys(SocialLivelySortBy) },
  })
  @ApiQuery({
    name: 'sortType',
    required: false,
    description: `data sort type can be one of ${Object.keys(SortType)}`,
    schema: { enum: Object.keys(SortType) },
  })
  @ApiResponse({ status: 200, description: 'Record Found.', type: FindAllViewDto})
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Record Not Found.' })
  @ApiResponse({ status: 417, description: 'Auth Token Expired.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  socialLivelyFindAll(
    @Query('page', new PaginationPipe()) page: number,
    @Query('offset', new PaginationPipe()) offset: number,
    @Query('sortType', new EnumPipe(SortType)) sortType: SortType,
    @Query('sortBy', new EnumPipe(SocialLivelySortBy)) sortBy: SocialLivelySortBy,
  ): RxJS.Observable<FindAllViewDto<SocialLivelyViewDto>> {
    return RxJS.from(this._socialLivelyService.findAll(
      (page - 1) * offset,
      offset,
      sortType ? sortType : SortType.ASC,
      sortBy ? sortBy : SocialLivelySortBy.TIMESTAMP
    )).pipe(
      RxJS.mergeMap((result: FindAllType<SocialLivelyEntity>) =>
        RxJS.merge(
          RxJS.of(result).pipe(
            RxJS.filter((findAllResult) => findAllResult.total === 0),
            RxJS.mergeMap(_ => RxJS.throwError(() => new HttpException({
                statusCode: '404',
                message: 'SocialLively Not Found',
                error: 'Not Found'
              }, HttpStatus.NOT_FOUND))
            )
          ),
          RxJS.of(result).pipe(
            RxJS.filter((findAllResult) => findAllResult.total >= 0),
            RxJS.map(findAllResult =>
              FindAllViewDto.from(page, offset, findAllResult.total,
                Math.ceil(findAllResult.total / offset), findAllResult.data) as FindAllViewDto<SocialLivelyViewDto> ,
            ),
            RxJS.catchError((_) => RxJS.throwError(() => new HttpException(
              {
                statusCode: '500',
                message: 'Something Went Wrong',
                error: 'Internal Server Error'
              }, HttpStatus.INTERNAL_SERVER_ERROR))
            )
          )
        )
      ),
      RxJS.tap({
        error: err => this._logger.error(`socialLivelyFindAll failed, sortBy: ${sortBy}`, err)
      }),
      RxJS.catchError(error =>
        RxJS.merge(
          RxJS.of(error).pipe(
            RxJS.filter(err => err instanceof HttpException),
            RxJS.mergeMap(err => RxJS.throwError(err)),
          ),
          RxJS.of(error).pipe(
            RxJS.filter(err => !(err instanceof HttpException)),
            RxJS.mergeMap(err =>
              RxJS.throwError(() => new HttpException(
                {
                  statusCode: '500',
                  message: 'Something Went Wrong',
                  error: 'Internal Server Error'
                }, HttpStatus.INTERNAL_SERVER_ERROR)
              )
            )
          )
        )
      ),
    )
  }

  @Get('/find/id/:uuid')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard('ADMIN'))
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'uuid',
    required: true,
    description: `find social lively by id `,
    schema: { type: 'uuid' },
  })
  @ApiResponse({ status: 200, description: 'Record Found.', type: SocialLivelyViewDto})
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Record Not Found.' })
  @ApiResponse({ status: 417, description: 'Auth Token Expired.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  socialLivelyFindById(@Param('uuid', new ParseUUIDPipe()) uuid): RxJS.Observable<SocialLivelyViewDto> {
    return RxJS.from(this._socialLivelyService.findById(uuid)).pipe(
      RxJS.map(entity => SocialLivelyViewDto.from(entity)),
      RxJS.tap({
        error: err => this._logger.error(`socialLivelyFindById failed, id: ${uuid}`, err)
      }),
      RxJS.catchError(error =>
        RxJS.merge(
          RxJS.of(error).pipe(
            RxJS.filter(err => err instanceof HttpException),
            RxJS.mergeMap(err => RxJS.throwError(err)),
          ),
          RxJS.of(error).pipe(
            RxJS.filter(err => !(err instanceof HttpException)),
            RxJS.mergeMap(err =>
              RxJS.throwError(() => new HttpException(
                {
                  statusCode: '500',
                  message: 'Something Went Wrong',
                  error: 'Internal Server Error'
                }, HttpStatus.INTERNAL_SERVER_ERROR)
              )
            )
          )
        )
      ),
    )
  }

  @Get('/find/social/:social')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard('ADMIN'))
  @UseGuards(JwtAuthGuard)
  @ApiParam({
    name: 'social',
    required: true,
    description: `find by one of the ${Object.keys(SocialType)}`,
    schema: { enum: Object.values(SocialType) },
  })
  @ApiResponse({ status: 200, description: 'Record Found.', type: SocialLivelyViewDto})
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Record Not Found.' })
  @ApiResponse({ status: 417, description: 'Auth Token Expired.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  socialLivelyFindBySocial(@Param('social', new EnumPipe(SocialType)) social): RxJS.Observable<SocialLivelyViewDto> {
    return RxJS.from(this._socialLivelyService.findOne( { where: {socialType: social } } )).pipe(
      RxJS.map(entity => SocialLivelyViewDto.from(entity)),
      RxJS.tap({
        error: err => this._logger.error(`socialLivelyFindBySocial failed, id: ${social}`, err)
      }),
      RxJS.catchError(error =>
        RxJS.merge(
          RxJS.of(error).pipe(
            RxJS.filter(err => err instanceof HttpException),
            RxJS.mergeMap(err => RxJS.throwError(err)),
          ),
          RxJS.of(error).pipe(
            RxJS.filter(err => !(err instanceof HttpException)),
            RxJS.mergeMap(err =>
              RxJS.throwError(() => new HttpException(
                {
                  statusCode: '500',
                  message: 'Something Went Wrong',
                  error: 'Internal Server Error'
                }, HttpStatus.INTERNAL_SERVER_ERROR)
              )
            )
          )
        )
      ),
    )
  }

  @Get('/find/total')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RoleGuard('ADMIN'))
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Record Found.'})
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 417, description: 'Auth Token Expired.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  socialLivelyFindTotalCount(): RxJS.Observable<object> {
    return this._socialLivelyService.findTotal().pipe(
      RxJS.map(total => ({total})),
      RxJS.tap({
        error: err => this._logger.error(`socialLivelyFindTotalCount failed`, err)
      }),
      RxJS.catchError(error =>
        RxJS.merge(
          RxJS.of(error).pipe(
            RxJS.filter(err => err instanceof HttpException),
            RxJS.mergeMap(err => RxJS.throwError(err)),
          ),
          RxJS.of(error).pipe(
            RxJS.filter(err => !(err instanceof HttpException)),
            RxJS.mergeMap(err =>
              RxJS.throwError(() => new HttpException(
                {
                  statusCode: '500',
                  message: 'Something Went Wrong',
                  error: 'Internal Server Error'
                }, HttpStatus.INTERNAL_SERVER_ERROR)
              )
            )
          )
        )
      ),
    )
  }
}
