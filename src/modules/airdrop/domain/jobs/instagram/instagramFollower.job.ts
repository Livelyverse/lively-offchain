import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { InjectEntityManager } from "@nestjs/typeorm";
import { EntityManager } from "typeorm";
import * as RxJS from "rxjs";
import { SocialLivelyEntity } from "../../entity/socialLively.entity";
import { FollowerError } from "../../error/follower.error";
import { SocialEventEntity } from "../../entity/socialEvent.entity";
import { SocialAirdropRuleEntity } from "../../entity/socialAirdropRule.entity";
import { SocialProfileEntity, SocialType } from "../../../../profile/domain/entity/socialProfile.entity";
import { SocialActionType } from "../../entity/enums";
import { SocialTrackerEntity } from "../../entity/socialTracker.entity";
import { SocialAirdropEntity } from "../../entity/socialAirdrop.entity";
import { AxiosError } from "axios";
import { TrackerError } from "../../error/tracker.error";

Injectable()
export class InstagramFollowerJob {
  private readonly _logger = new Logger(InstagramFollowerJob.name);
  private readonly _apiKey: string;
  private readonly _apiHost: string;
  private readonly _FETCH_COUNT = 50;
  private readonly _apiDelay: number;
  private _isRunning: boolean;

  constructor(
    private readonly _httpService: HttpService,
    private readonly _configService: ConfigService,
    private readonly _schedulerRegistry: SchedulerRegistry,
    @InjectEntityManager()
    private readonly _entityManager: EntityManager,
  ) {
    this._apiKey = this._configService.get<string>('airdrop.instagram.apiKey');
    if (!this._apiKey) {
      throw new Error("airdrop.instagram.apiKey config is empty");
    }

    this._apiHost = this._configService.get<string>('airdrop.instagram.apiHost');
    if (!this._apiHost) {
      throw new Error("airdrop.instagram.apiHost config is empty");
    }

    this._isRunning = false;
    this._apiDelay = this._configService.get<number>('airdrop.instagram.apiDelay');
  }

  @Cron(CronExpression.EVERY_DAY_AT_11PM)
  fetchInstagramFollowers() {

    if(!this._isRunning) {
      this._isRunning = true;
    } else {
      this._logger.warn("fetchInstagramFollowers is already running . . .");
      return;
    }

    const socialLivelyQueryResultObservable = RxJS.from(this._entityManager.createQueryBuilder(SocialLivelyEntity, "socialLively")
      .where('"socialLively"."socialType" = \'INSTAGRAM\'')
      .andWhere('"socialLively"."isActive" = \'true\'')
      .getOneOrFail())
      .pipe(
        RxJS.tap((socialLively) => this._logger.debug(`fetch social lively success, socialType: ${socialLively.socialType}`)),
        RxJS.catchError(err => RxJS.throwError(() => new FollowerError('fetch instagram social lively failed', err)))
      )

    const socialEventQueryResultObservable = RxJS.from(this._entityManager.createQueryBuilder(SocialEventEntity, "socialEvent")
      .select()
      .innerJoin("social_airdrop_schedule", "airdropSchedule", '"airdropSchedule"."id" = "socialEvent"."airdropScheduleId"')
      .innerJoin("social_lively", "socialLively", '"socialLively"."id" = "airdropSchedule"."socialLivelyId"')
      .where('"socialLively"."socialType" = \'INSTAGRAM\'')
      .andWhere('"socialEvent"."isActive" = \'true\'')
      .andWhere('("socialEvent"."content"->\'data\'->>\'hashtags\')::jsonb ? ("airdropSchedule"."hashtags"->>\'join\')::text')
      .andWhere('"airdropSchedule"."airdropEndAt" > NOW()')
      .getOne())
      .pipe(
        RxJS.mergeMap((queryResult) =>
          RxJS.merge(
            RxJS.of(queryResult).pipe(
              RxJS.filter((socialEvent) => !!socialEvent),
              RxJS.tap((socialEvent) => this._logger.debug(`fetch social event airdrop follow found, socialEventId: ${socialEvent?.id}, contentUrl: ${socialEvent?.contentUrl}`)),
            ),
            RxJS.of(queryResult).pipe(
              RxJS.filter((socialEvent) => !socialEvent),
              RxJS.tap((_) => this._logger.debug(`fetch social event airdrop follow not found`)),
            )
          )
        ),
        RxJS.catchError(err => RxJS.throwError(() => new FollowerError('fetch social event airdrop follow failed', err)))
      )

    this._logger.debug("instagram follower job starting . . . ");

    RxJS.zip(socialLivelyQueryResultObservable, socialEventQueryResultObservable).pipe(
      // fetch social instagram airdrop rules
      RxJS.mergeMap(([socialLively, socialEvent]) =>
        RxJS.from(this._entityManager.createQueryBuilder(SocialAirdropRuleEntity, "airdropRule")
          .select()
          .where('"airdropRule"."socialType" = :socialType', {socialType: SocialType.INSTAGRAM})
          .andWhere('"airdropRule"."actionType" = :actionType', {actionType: SocialActionType.FOLLOW})
          .getOneOrFail()
        ).pipe(
          RxJS.tap({
            next: (airdropRule) => this._logger.debug(`instagram follower airdrop rule found, token: ${airdropRule.unit},  amount: ${airdropRule.amount}, decimal: ${airdropRule.decimal}`),
            error: (err) => this._logger.error(`find instagram follower airdrop rule failed`,err)
          }),
          RxJS.map((airdropRule) => [ socialLively, socialEvent, airdropRule ]),
          RxJS.catchError(err => RxJS.throwError(() => new FollowerError('fetch instagram follower airdrop rule failed', err)))
        )
      ),
      RxJS.concatMap(([socialLively, socialEvent, airdropRule ]: [SocialLivelyEntity, SocialEventEntity, SocialAirdropRuleEntity]) =>
        RxJS.defer(() => RxJS.from(this._fetchFollowers(socialLively.userId))).pipe(
          RxJS.tap({
            next: (followers) => this._logger.log(`fetch instagram followers count: ${followers.data.data.user.length}`),
          }),
          RxJS.concatMap((followers) =>
            RxJS.from(followers.data.data.user).pipe(
              RxJS.map((follower) => [socialLively, socialEvent, airdropRule, follower]),
            )
          ),
          RxJS.retry({
            count:3,
            delay: (error, retryCount) => RxJS.of([error, retryCount]).pipe(
              RxJS.mergeMap(([error, retryCount]) =>
                RxJS.merge(
                  RxJS.of([error, retryCount]).pipe(
                    RxJS.filter(([err,count]) => err instanceof AxiosError &&
                      (err.code === AxiosError.ECONNABORTED || err.code === AxiosError.ERR_NETWORK || err.code === AxiosError.ETIMEDOUT) &&
                      count <= 3
                    ),
                    RxJS.tap({
                      error: err => this._logger.warn(`httpClient get instagram followers failed, message: ${err.message}, code: ${err.code}`)
                    }),
                    RxJS.delay(60000)
                  ),
                  RxJS.of([error, retryCount]).pipe(
                    RxJS.filter(([err,count]) => err instanceof AxiosError &&
                      (err.code === AxiosError.ECONNABORTED || err.code === AxiosError.ERR_NETWORK || err.code === AxiosError.ETIMEDOUT) &&
                      count > 3
                    ),
                    RxJS.mergeMap(([err,_]) => RxJS.throwError(() => new TrackerError('instagram get followers failed', err)))
                  ),
                  RxJS.of([error, retryCount]).pipe(
                    RxJS.filter(([err,_]) => err instanceof Error),
                    RxJS.mergeMap(([err,_]) => RxJS.throwError(() => new TrackerError('instagram get followers failed', err))),
                  )
                )
              ),
              RxJS.tap(([_, retryCount]) => this._logger.warn(`get lively instagram followers failed, retry ${retryCount} . . . `))
            )
          }),
          RxJS.tap({
            error: (error) => this._logger.error(`fetch instagram followers failed`, error)
          }),
          RxJS.catchError((error) =>
            RxJS.merge(
              RxJS.of(error).pipe(
                RxJS.filter(err => err instanceof FollowerError || err instanceof AxiosError),
                RxJS.mergeMap(err => RxJS.throwError(err))
              ),
              RxJS.of(error).pipe(
                RxJS.filter(err => !(err instanceof FollowerError && err instanceof AxiosError)),
                RxJS.mergeMap(err => RxJS.throwError(() => new FollowerError('instagram fetch post like failed', err)))
              )
            )
          ),
          RxJS.finalize(() => this._logger.debug(`finalize instagram client follower . . .`)),
        )
      ),
      RxJS.concatMap(([socialLively, socialEvent, airdropRule, follower]: [SocialLivelyEntity, SocialEventEntity, SocialAirdropRuleEntity, any]) =>
        RxJS.from(this._entityManager.createQueryBuilder(SocialProfileEntity, "socialProfile")
          .select('"socialProfile".*')
          .addSelect('"socialTracker"."id" as "trackerId"')
          .leftJoin("user", "users", '"users"."id" = "socialProfile"."userId"')
          .leftJoin("social_tracker", "socialTracker",
            '"socialTracker"."socialProfileId" = "socialProfile"."id" and "socialTracker"."actionType" = :type', {type: SocialActionType.FOLLOW})
          .where('"socialProfile"."username" = :username', {username: follower.username})
          .andWhere('"socialProfile"."socialType" = :socialType', {socialType: socialLively.socialType})
          .getRawOne()
        ).pipe(
          RxJS.concatMap((result) =>
            RxJS.merge(
              RxJS.of(result).pipe(
                RxJS.filter((data) => !!data),
                RxJS.map((data) => {
                  const {trackerId, ...socialProfile} = data;
                  return {
                    trackerId,
                    socialProfile,
                    socialLively,
                    socialEvent,
                    airdropRule,
                    follower
                  };
                })
              ),
              RxJS.of(result).pipe(
                RxJS.filter((data) => !data),
                RxJS.map((_) => {
                  return {
                    trackerId: null,
                    socialProfile: null,
                    socialLively,
                    socialEvent,
                    airdropRule,
                    follower
                  }
                })
              ),
            )
          ),
          RxJS.tap({
            error: err => this._logger.error(`fetch instagram lively socialProfile failed`, err)
          }),
          RxJS.catchError(error => RxJS.throwError(() => new FollowerError('fetch instagram lively socialProfile failed', error)))
        ),
      ),
      RxJS.concatMap((inputData) =>
        RxJS.merge(
          RxJS.of(inputData).pipe(
            RxJS.filter((data)=> !data.socialProfile),
            RxJS.map((data) => {
              data.socialProfile = new SocialProfileEntity();
              data.socialProfile.username = data.follower.username;
              data.socialProfile.socialType = data.socialLively.socialType;
              data.socialProfile.socialId = data.follower.pk_id;
              data.socialProfile.socialName = data.follower.full_name;
              data.socialProfile.profileUrl = "https://www.instagram.com/" + data.socialProfile.username;
              data.socialProfile.location = null;
              data.socialProfile.website = null;
              return ({socialProfile: data.socialProfile, socialTracker: null, socialAirdrop: null, ...data})
            }),
            RxJS.concatMap((data) =>
              RxJS.from(this._entityManager.getRepository(SocialProfileEntity).insert(data.socialProfile)
              ).pipe(
                RxJS.map((result) => {
                  return {
                    socialProfile: data.socialProfile,
                    socialTracker: data.socialTracker,
                    socialAirdrop: data.socialAirdrop,
                  };
                }),
                RxJS.tap({
                  next: data => this._logger.debug(`register instagram follower profile success, username: ${data.socialProfile.username}`),
                  error: err => this._logger.error(`register instagram follower failed, socialUsername: ${data.socialProfile.username}, socialProfileId: ${data.socialProfile.Id}`,err)
                }),
                RxJS.catchError(error => RxJS.throwError(() => new FollowerError('twitter follower transaction failed', error)))
              )
            ),
          ),
          RxJS.of(inputData).pipe(
            RxJS.filter((data)=> !data.trackerId && data.socialProfile?.userId),
            RxJS.map((data) => {
              data.socialProfile.socialId = data.follower.pk_id;
              data.socialProfile.socialName = data.follower.full_name;
              data.socialProfile.profileUrl = "https://www.instagram.com/" + data.socialProfile.username;
              data.socialProfile.location = null;
              data.socialProfile.website = null;

              if(data.socialEvent) {
                const socialTracker = new SocialTrackerEntity();
                socialTracker.actionType = SocialActionType.FOLLOW;
                socialTracker.socialProfile = data.socialProfile;
                socialTracker.socialEvent = data.socialEvent;

                const socialAirdrop = new SocialAirdropEntity();
                socialAirdrop.airdropRule = data.airdropRule;
                socialAirdrop.socialTracker = socialTracker;
                return ({socialProfile: data.socialProfile, socialTracker, socialAirdrop, ...data})
              }
              return ({socialProfile: data.socialProfile, socialTracker: null, socialAirdrop: null, ...data})
            }),
            RxJS.concatMap((data) =>
              RxJS.from(
                this._entityManager.connection.transaction(async (manager) => {
                  if(data.socialTracker) {
                    await manager.createQueryBuilder()
                      .insert()
                      .into(SocialTrackerEntity)
                      .values([data.socialTracker])
                      .execute();

                    await manager.createQueryBuilder()
                      .insert()
                      .into(SocialAirdropEntity)
                      .values([data.socialAirdrop])
                      .execute();
                  }

                  await manager.getRepository(SocialProfileEntity).save(data.socialProfile)
                })
              ).pipe(
                RxJS.map((result) => {
                  return {
                    socialProfile: data.socialProfile,
                    socialTracker: data.socialTracker,
                    socialAirdrop: data.socialAirdrop,
                  };
                }),
                RxJS.tap({
                  next: data => this._logger.debug(`update instagram follower profile success, username: ${data.socialProfile.username}`),
                  error: err => this._logger.error(`update instagram follower failed, socialUsername: ${data.socialProfile.username}, socialProfileId: ${data.socialProfile.Id}`,err)
                }),
                RxJS.catchError(error => RxJS.throwError(() => new FollowerError('twitter follower transaction failed', error)))
              )
            ),
          ),
          RxJS.of(inputData).pipe(
            RxJS.filter((data) => !data.trackerId && !data.socialProfile?.userId),
            RxJS.map((data) => { data.socialProfile }),
            RxJS.tap((_) => this._logger.debug(`instagram follower hasn't still verified by user, username: ${inputData.follower.username}`))
          ),
          RxJS.of(inputData).pipe(
            RxJS.filter((data)=> data.trackerId),
            RxJS.map((data) => { data.socialProfile }),
            RxJS.tap((_) => this._logger.debug(`instagram follower already has registered, username: ${inputData.follower.username}`))
          )
        )
      ),
    ).subscribe({
      next: (data: {socialProfile: SocialProfileEntity, socialTracker: SocialTrackerEntity, socialAirdrop: SocialAirdropEntity}) => {
        if (data?.socialTracker) {
          this._logger.log(`instagram follower profile verified successfully, follower: ${data.socialProfile.username}, trackerId: ${data.socialTracker.id}`);
        }
      },
      error: (error) => {
        this._logger.error(`fetch instagram followers failed\n cause: ${error?.cause?.stack}`, error);
        this._isRunning = false;
      },
      complete: () => {
        this._logger.debug(`fetch instagram followers completed . . .`);
        this._isRunning = false;
      }
    });
  }

  private _fetchFollowers(socialLivelyUserId: string): RxJS.Observable<any> {
    return this._httpService.get(`https://instagram188.p.rapidapi.com/userfollowers/${socialLivelyUserId}/${this._FETCH_COUNT}/%7Bend_cursor%7D`, {
      headers: {
        'X-RapidAPI-Key': this._apiKey,
        'X-RapidAPI-Host': this._apiHost
      }
    }).pipe(
      RxJS.expand(response =>
          RxJS.merge(
            RxJS.of(response).pipe(
              RxJS.filter(axiosResponse =>
                axiosResponse?.data?.success &&
                axiosResponse?.data?.data?.end_cursor
              ),
              RxJS.delay(this._apiDelay),
              RxJS.mergeMap(axiosResponse =>
                this._httpService.get(`https://instagram188.p.rapidapi.com/userfollowers/${socialLivelyUserId}/${this._FETCH_COUNT}/${axiosResponse.data.data.end_cursor}`, {
                  headers: {
                    'X-RapidAPI-Key': this._apiKey,
                    'X-RapidAPI-Host': this._apiHost
                  }
                })
              ),
            ),
            RxJS.of(response).pipe(
              RxJS.filter(axiosResponse =>
                !axiosResponse?.data?.success ||
                !axiosResponse?.data?.data?.end_cursor
              ),
              RxJS.tap({
                next: response => this._logger.debug('_fetchPostComments call api complete,' +
                  `data.success: ${response?.data?.success}`)
              }),
              RxJS.mergeMap(_ => RxJS.EMPTY)
            )
          ),
        1
      ),
      RxJS.identity,
    )
  }
}