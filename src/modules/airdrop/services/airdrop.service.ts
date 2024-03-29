import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { BalanceSortBy, FindAllType, SortType } from "./IAirdrop.service";
import { InjectEntityManager } from "@nestjs/typeorm";
import { EntityManager, IsNull, Not } from "typeorm";
import { SocialAirdropEntity } from "../domain/entity/socialAirdrop.entity";
import * as RxJS from "rxjs";
import { AirdropFilterType } from "../domain/dto/airdropInfoView.dto";
import { SocialAirdropRuleEntity } from "../domain/entity/socialAirdropRule.entity";
import { SocialType } from "../../profile/domain/entity/socialProfile.entity";
import { SocialActionType } from "../domain/entity/enums";
import { UserEntity } from "../../profile/domain/entity";
import { AirdropBalance } from "../domain/dto/airdropBalanceView.dto";
import { SocialLivelyEntity } from "../domain/entity/socialLively.entity";
import { AirdropEventStatus, AirdropUserFilterType } from "../domain/dto/airdropUserView.dto";

export type FindAllBalanceType = { data: Array<AirdropBalance>, total: number }

export type FindAllAirdropType = { data: Array<SocialAirdropUserView>, total: number }

export interface AirdropUserBalance {
  email: string;
  userId: string;
  pending: bigint;
  settlement: bigint;
  total: bigint;
}

export enum AirdropSortBy {
  TIMESTAMP = 'createdAt',
}

export enum AirdropViewSortBy {
  TIMESTAMP = 'eventPublishedAt',
}

export interface SocialAirdropUserView {
  eventId: string;
  airdropId: string;
  contentId: string;
  contentUrl: string;
  socialProfileUrl: string;
  eventPublishedAt: Date;
  airdropStartAt: Date;
  airdropEndAt: Date;
  hashtags: string[];
  userId: string;
  email: string;
  wallet: string;
  socialName: string;
  socialUsername: string;
  socialType: string;
  actionType: string;
  amount: string;
  unit: string;
  txHash: string;
  txTimestamp: Date;
  eventStatus: AirdropEventStatus;
}

@Injectable()
export class AirdropService {

  private readonly _logger = new Logger(AirdropService.name);
  constructor(@InjectEntityManager() private readonly _entityManager: EntityManager) {
  }

  findEventByUser(
    userId: string,
    offset: number,
    limit: number,
    sortType: SortType,
    sortBy: AirdropViewSortBy,
    eventStatus: AirdropEventStatus,
    socialType: SocialType,
    actionType: SocialActionType,
  ): RxJS.Observable<FindAllAirdropType> {

    return RxJS.merge(
      RxJS.of({eventStatus, socialType, actionType}).pipe(
        RxJS.filter(filters => !!filters.eventStatus && !!filters.socialType && !!filters.actionType),
        RxJS.concatMap( filters =>
          RxJS.zip(
            RxJS.from(this._entityManager.query(`
              select "airdropView"."eventId", "airdropView"."airdropId", "airdropView"."contentId",
              "airdropView"."contentUrl", "airdropView"."socialProfileUrl", "airdropView"."eventPublishedAt",
              "airdropView"."airdropStartAt", "airdropView"."airdropEndAt", "airdropView"."hashtags",
              "airdropView"."userId", "airdropView"."email", "airdropView"."wallet",
              "airdropView"."socialName", "airdropView"."socialUsername",
              "airdropView"."socialType", "airdropView"."actionType",
              "airdropView"."amount", "airdropView"."unit","airdropView"."txHash", 
              "airdropView"."txTimestamp", "airdropView"."eventStatus"     
              from social_airdrop_view "airdropView"        
              where "airdropView"."userId" = $1 and "airdropView"."eventStatus" = $2 and
              "airdropView"."socialType" = $3 and "airdropView"."actionType" = $4 
              order by "airdropView"."${sortBy}" ${sortType}
              offset $5 
              limit $6`, [userId, filters.eventStatus, filters.socialType,
                filters.actionType, offset, limit]
              )
            ).pipe(
              RxJS.tap({
                next: (views) => this._logger.debug(`findEventByUser view query success, userId: ${userId}, 
                       eventStatus: ${eventStatus}, socialType: ${socialType}, actionType: ${actionType}`),
                error: err => this._logger.error(`findEventByUser view query failed, userId: ${userId}`, err),
              }),
            ),
            RxJS.from(this._entityManager.query(`
              select count(*) as total      
              from social_airdrop_view "airdropView"        
              where "airdropView"."userId" = $1 and "airdropView"."eventStatus" = $2 and
              "airdropView"."socialType" = $3 and "airdropView"."actionType" = $4 `,
              [userId, filters.eventStatus, filters.socialType, filters.actionType]
              )
            ).pipe(
              RxJS.tap({
                next: (result) => this._logger.debug(`findEventByUser total query success, userId: ${userId}, 
                         eventStatus: ${eventStatus}, socialType: ${socialType}, actionType: ${actionType}, total: ${result[0].total}`),
                error: err => this._logger.error(`findEventByUser view query failed, userId: ${userId}`, err),
              }),
            )
          ).pipe(
            RxJS.map(tupleResult => ({data: tupleResult[0], total:parseInt(tupleResult[1][0].total)}))
          )
        )
      ),
      RxJS.of({eventStatus, socialType, actionType}).pipe(
        RxJS.filter(filters => !filters.eventStatus && !!filters.socialType && !!filters.actionType),
        RxJS.concatMap( filters =>
          RxJS.zip(
            RxJS.from(this._entityManager.query(`
                select "airdropView"."eventId", "airdropView"."airdropId", "airdropView"."contentId",
                "airdropView"."contentUrl", "airdropView"."socialProfileUrl", "airdropView"."eventPublishedAt",
                "airdropView"."airdropStartAt", "airdropView"."airdropEndAt", "airdropView"."hashtags",
                "airdropView"."userId", "airdropView"."email", "airdropView"."wallet",
                "airdropView"."socialName", "airdropView"."socialUsername",
                "airdropView"."socialType", "airdropView"."actionType",
                "airdropView"."amount", "airdropView"."unit","airdropView"."txHash", 
                "airdropView"."txTimestamp", "airdropView"."eventStatus"     
                from social_airdrop_view "airdropView"        
                where "airdropView"."userId" = $1 and
                "airdropView"."socialType" = $2 and "airdropView"."actionType" = $3 
                order by "airdropView"."${sortBy}" ${sortType}
                offset $4 
                limit $5`, [userId, filters.socialType, filters.actionType, offset, limit]
              )
            ).pipe(
              RxJS.tap({
                next: (views) => this._logger.debug(`findEventByUser view query success, userId: ${userId}, 
                         eventStatus: ${eventStatus}, socialType: ${socialType}, actionType: ${actionType}`),
                error: err => this._logger.error(`findEventByUser view query failed, userId: ${userId}`, err),
              }),
            ),
            RxJS.from(this._entityManager.query(`
                select count(*) as total      
                from social_airdrop_view "airdropView"        
                where "airdropView"."userId" = $1 and "airdropView"."socialType" = $2 and 
                "airdropView"."actionType" = $3 `,
                [userId, filters.socialType, filters.actionType]
              )
            ).pipe(
              RxJS.tap({
                next: (result) => this._logger.debug(`findEventByUser total query success, userId: ${userId}, 
                         eventStatus: ${eventStatus}, socialType: ${socialType}, actionType: ${actionType}, total: ${result[0].total}`),
                error: err => this._logger.error(`findEventByUser view query failed, userId: ${userId}`, err),
              }),
            )
          ).pipe(
            RxJS.map(tupleResult => ({data: tupleResult[0], total:parseInt(tupleResult[1][0].total)}))
          )
        )
      ),
      RxJS.of({eventStatus, socialType, actionType}).pipe(
        RxJS.filter(filters => !filters.eventStatus && !filters.socialType && !!filters.actionType),
        RxJS.concatMap( filters =>
          RxJS.zip(
            RxJS.from(this._entityManager.query(`
                select "airdropView"."eventId", "airdropView"."airdropId", "airdropView"."contentId",
                "airdropView"."contentUrl", "airdropView"."socialProfileUrl", "airdropView"."eventPublishedAt",
                "airdropView"."airdropStartAt", "airdropView"."airdropEndAt", "airdropView"."hashtags",
                "airdropView"."userId", "airdropView"."email", "airdropView"."wallet",
                "airdropView"."socialName", "airdropView"."socialUsername",
                "airdropView"."socialType", "airdropView"."actionType",
                "airdropView"."amount", "airdropView"."unit","airdropView"."txHash", 
                "airdropView"."txTimestamp", "airdropView"."eventStatus"     
                from social_airdrop_view "airdropView"        
                where "airdropView"."userId" = $1 and "airdropView"."actionType" = $2 
                order by "airdropView"."${sortBy}" ${sortType}
                offset $3 
                limit $4`, [userId, filters.actionType, offset, limit]
              )
            ).pipe(
              RxJS.tap({
                next: (views) => this._logger.debug(`findEventByUser view query success, userId: ${userId}, 
                         eventStatus: ${eventStatus}, socialType: ${socialType}, actionType: ${actionType}`),
                error: err => this._logger.error(`findEventByUser view query failed, userId: ${userId}`, err),
              }),
            ),
            RxJS.from(this._entityManager.query(`
                select count(*) as total      
                from social_airdrop_view "airdropView"        
                where "airdropView"."userId" = $1 and "airdropView"."actionType" = $2 `,
                [userId, filters.actionType]
              )
            ).pipe(
              RxJS.tap({
                next: (result) => this._logger.debug(`findEventByUser total query success, userId: ${userId}, 
                         eventStatus: ${eventStatus}, socialType: ${socialType}, actionType: ${actionType}, total: ${result[0].total}`),
                error: err => this._logger.error(`findEventByUser view query failed, userId: ${userId}`, err),
              }),
            )
          ).pipe(
            RxJS.map(tupleResult => ({data: tupleResult[0], total:parseInt(tupleResult[1][0].total)}))
          )
        )
      ),
      RxJS.of({eventStatus, socialType, actionType}).pipe(
        RxJS.filter(filters => !filters.eventStatus && !filters.socialType && !filters.actionType),
        RxJS.concatMap( _ =>
          RxJS.zip(
            RxJS.from(this._entityManager.query(`
                select "airdropView"."eventId", "airdropView"."airdropId", "airdropView"."contentId",
                "airdropView"."contentUrl", "airdropView"."socialProfileUrl", "airdropView"."eventPublishedAt",
                "airdropView"."airdropStartAt", "airdropView"."airdropEndAt", "airdropView"."hashtags",
                "airdropView"."userId", "airdropView"."email", "airdropView"."wallet",
                "airdropView"."socialName", "airdropView"."socialUsername",
                "airdropView"."socialType", "airdropView"."actionType",
                "airdropView"."amount", "airdropView"."unit","airdropView"."txHash", 
                "airdropView"."txTimestamp", "airdropView"."eventStatus"     
                from social_airdrop_view "airdropView"        
                where "airdropView"."userId" = $1
                order by "airdropView"."${sortBy}" ${sortType}
                offset $2 
                limit $3`, [userId, offset, limit]
              )
            ).pipe(
              RxJS.tap({
                next: (views) => this._logger.debug(`findEventByUser view query success, userId: ${userId}, 
                         eventStatus: ${eventStatus}, socialType: ${socialType}, actionType: ${actionType}`),
                error: err => this._logger.error(`findEventByUser view query failed, userId: ${userId}`, err),
              }),
            ),
            RxJS.from(this._entityManager.query(`
                select count(*) as total      
                from social_airdrop_view "airdropView"        
                where "airdropView"."userId" = $1`,
                [userId]
              )
            ).pipe(
              RxJS.tap({
                next: (result) => this._logger.debug(`findEventByUser total query success, userId: ${userId}, 
                         eventStatus: ${eventStatus}, socialType: ${socialType}, actionType: ${actionType}, total: ${result[0].total}`),
                error: err => this._logger.error(`findEventByUser view query failed, userId: ${userId}`, err),
              }),
            )
          ).pipe(
            RxJS.map(tupleResult => ({data: tupleResult[0], total:parseInt(tupleResult[1][0].total)}))
          )
        )
      ),
      RxJS.of({eventStatus, socialType, actionType}).pipe(
        RxJS.filter(filters => !!filters.eventStatus && !filters.socialType && !!filters.actionType),
        RxJS.concatMap( filters =>
          RxJS.zip(
            RxJS.from(this._entityManager.query(`
              select "airdropView"."eventId", "airdropView"."airdropId", "airdropView"."contentId",
              "airdropView"."contentUrl", "airdropView"."socialProfileUrl", "airdropView"."eventPublishedAt",
              "airdropView"."airdropStartAt", "airdropView"."airdropEndAt", "airdropView"."hashtags",
              "airdropView"."userId", "airdropView"."email", "airdropView"."wallet",
              "airdropView"."socialName", "airdropView"."socialUsername",
              "airdropView"."socialType", "airdropView"."actionType",
              "airdropView"."amount", "airdropView"."unit","airdropView"."txHash", 
              "airdropView"."txTimestamp", "airdropView"."eventStatus"     
              from social_airdrop_view "airdropView"        
              where "airdropView"."userId" = $1 and "airdropView"."eventStatus" = $2 and 
              "airdropView"."actionType" = $3 
              order by "airdropView"."${sortBy}" ${sortType}
              offset $4 
              limit $5`, [userId, filters.eventStatus, filters.actionType, offset, limit]
              )
            ).pipe(
              RxJS.tap({
                next: (views) => this._logger.debug(`findEventByUser view query success, userId: ${userId}, 
                       eventStatus: ${eventStatus}, socialType: ${socialType}, actionType: ${actionType}`),
                error: err => this._logger.error(`findEventByUser view query failed, userId: ${userId}`, err),
              }),
            ),
            RxJS.from(this._entityManager.query(`
              select count(*) as total      
              from social_airdrop_view "airdropView"        
              where "airdropView"."userId" = $1 and "airdropView"."eventStatus" = $2
              and "airdropView"."actionType" = $3`,
                [userId, filters.eventStatus, filters.actionType]
              )
            ).pipe(
              RxJS.tap({
                next: (result) => this._logger.debug(`findEventByUser total query success, userId: ${userId}, 
                         eventStatus: ${eventStatus}, socialType: ${socialType}, actionType: ${actionType}, total: ${result[0].total}`),
                error: err => this._logger.error(`findEventByUser view query failed, userId: ${userId}`, err),
              }),
            )
          ).pipe(
            RxJS.map(tupleResult => ({data: tupleResult[0], total:parseInt(tupleResult[1][0].total)}))
          )
        )
      ),
      RxJS.of({eventStatus, socialType, actionType}).pipe(
        RxJS.filter(filters => !!filters.eventStatus && !!filters.socialType && !filters.actionType),
        RxJS.concatMap( filters =>
          RxJS.zip(
            RxJS.from(this._entityManager.query(`
              select "airdropView"."eventId", "airdropView"."airdropId", "airdropView"."contentId",
              "airdropView"."contentUrl", "airdropView"."socialProfileUrl", "airdropView"."eventPublishedAt",
              "airdropView"."airdropStartAt", "airdropView"."airdropEndAt", "airdropView"."hashtags",
              "airdropView"."userId", "airdropView"."email", "airdropView"."wallet",
              "airdropView"."socialName", "airdropView"."socialUsername",
              "airdropView"."socialType", "airdropView"."actionType",
              "airdropView"."amount", "airdropView"."unit","airdropView"."txHash", 
              "airdropView"."txTimestamp", "airdropView"."eventStatus"     
              from social_airdrop_view "airdropView"        
              where "airdropView"."userId" = $1 and "airdropView"."eventStatus" = $2 and
              "airdropView"."socialType" = $3
              order by "airdropView"."${sortBy}" ${sortType}
              offset $4 
              limit $5`, [userId, filters.eventStatus, filters.socialType, offset, limit]
              )
            ).pipe(
              RxJS.tap({
                next: (views) => this._logger.debug(`findEventByUser view query success, userId: ${userId}, 
                       eventStatus: ${eventStatus}, socialType: ${socialType}, actionType: ${actionType}`),
                error: err => this._logger.error(`findEventByUser view query failed, userId: ${userId}`, err),
              }),
            ),
            RxJS.from(this._entityManager.query(`
              select count(*) as total      
              from social_airdrop_view "airdropView"        
              where "airdropView"."userId" = $1 and "airdropView"."eventStatus" = $2 and
              "airdropView"."socialType" = $3`,
                [userId, filters.eventStatus, filters.socialType]
              )
            ).pipe(
              RxJS.tap({
                next: (result) => this._logger.debug(`findEventByUser total query success, userId: ${userId}, 
                         eventStatus: ${eventStatus}, socialType: ${socialType}, actionType: ${actionType}, total: ${result[0].total}`),
                error: err => this._logger.error(`findEventByUser view query failed, userId: ${userId}`, err),
              }),
            )
          ).pipe(
            RxJS.map(tupleResult => ({data: tupleResult[0], total:parseInt(tupleResult[1][0].total)}))
          )
        )
      ),
      RxJS.of({eventStatus, socialType, actionType}).pipe(
        RxJS.filter(filters => !filters.eventStatus && !!filters.socialType && !filters.actionType),
        RxJS.concatMap( filters =>
          RxJS.zip(
            RxJS.from(this._entityManager.query(`
              select "airdropView"."eventId", "airdropView"."airdropId", "airdropView"."contentId",
              "airdropView"."contentUrl", "airdropView"."socialProfileUrl", "airdropView"."eventPublishedAt",
              "airdropView"."airdropStartAt", "airdropView"."airdropEndAt", "airdropView"."hashtags",
              "airdropView"."userId", "airdropView"."email", "airdropView"."wallet",
              "airdropView"."socialName", "airdropView"."socialUsername",
              "airdropView"."socialType", "airdropView"."actionType",
              "airdropView"."amount", "airdropView"."unit","airdropView"."txHash", 
              "airdropView"."txTimestamp", "airdropView"."eventStatus"     
              from social_airdrop_view "airdropView"        
              where "airdropView"."userId" = $1 and "airdropView"."socialType" = $2                
              order by "airdropView"."${sortBy}" ${sortType}
              offset $3 
              limit $4`, [userId, filters.socialType, offset, limit]
              )
            ).pipe(
              RxJS.tap({
                next: (views) => this._logger.debug(`findEventByUser view query success, userId: ${userId}, 
                       eventStatus: ${eventStatus}, socialType: ${socialType}, actionType: ${actionType}`),
                error: err => this._logger.error(`findEventByUser view query failed, userId: ${userId}`, err),
              }),
            ),
            RxJS.from(this._entityManager.query(`
              select count(*) as total      
              from social_airdrop_view "airdropView"        
              where "airdropView"."userId" = $1 and "airdropView"."socialType" = $2`,
                [userId, filters.socialType]
              )
            ).pipe(
              RxJS.tap({
                next: (result) => this._logger.debug(`findEventByUser total query success, userId: ${userId}, 
                         eventStatus: ${eventStatus}, socialType: ${socialType}, actionType: ${actionType}, total: ${result[0].total}`),
                error: err => this._logger.error(`findEventByUser view query failed, userId: ${userId}`, err),
              }),
            )
          ).pipe(
            RxJS.map(tupleResult => ({data: tupleResult[0], total:parseInt(tupleResult[1][0].total)}))
          )
        )
      ),
      RxJS.of({eventStatus, socialType, actionType}).pipe(
        RxJS.filter(filters => !!filters.eventStatus && !filters.socialType && !filters.actionType),
        RxJS.concatMap( filters =>
          RxJS.zip(
            RxJS.from(this._entityManager.query(`
              select "airdropView"."eventId", "airdropView"."airdropId", "airdropView"."contentId",
              "airdropView"."contentUrl", "airdropView"."socialProfileUrl", "airdropView"."eventPublishedAt",
              "airdropView"."airdropStartAt", "airdropView"."airdropEndAt", "airdropView"."hashtags",
              "airdropView"."userId", "airdropView"."email", "airdropView"."wallet",
              "airdropView"."socialName", "airdropView"."socialUsername",
              "airdropView"."socialType", "airdropView"."actionType",
              "airdropView"."amount", "airdropView"."unit","airdropView"."txHash", 
              "airdropView"."txTimestamp", "airdropView"."eventStatus"     
              from social_airdrop_view "airdropView"        
              where "airdropView"."userId" = $1 and "airdropView"."eventStatus" = $2
              order by "airdropView"."${sortBy}" ${sortType}
              offset $3 
              limit $4`, [userId, filters.eventStatus, offset, limit]
              )
            ).pipe(
              RxJS.tap({
                next: (views) => this._logger.debug(`findEventByUser view query success, userId: ${userId}, 
                       eventStatus: ${eventStatus}, socialType: ${socialType}, actionType: ${actionType}`),
                error: err => this._logger.error(`findEventByUser view query failed, userId: ${userId}`, err),
              }),
            ),
            RxJS.from(this._entityManager.query(`
              select count(*) as total      
              from social_airdrop_view "airdropView"        
              where "airdropView"."userId" = $1 and "airdropView"."eventStatus" = $2`,
                [userId, filters.eventStatus]
              )
            ).pipe(
              RxJS.tap({
                next: (result) => this._logger.debug(`findEventByUser total query success, userId: ${userId}, 
                         eventStatus: ${eventStatus}, socialType: ${socialType}, actionType: ${actionType}, total: ${result[0].total}`),
                error: err => this._logger.error(`findEventByUser view query failed, userId: ${userId}`, err),
              }),
            )
          ).pipe(
            RxJS.map(tupleResult => ({data: tupleResult[0], total:parseInt(tupleResult[1][0].total)}))
          )
        )
      )
    ).pipe(
      RxJS.catchError((_) => RxJS.throwError(() => new HttpException(
        {
          statusCode: '500',
          message: 'Something Went Wrong',
          error: 'Internal Server Error'
        }, HttpStatus.INTERNAL_SERVER_ERROR))
      )
    )
  }

  findAll(
    offset: number,
    limit: number,
    sortType: SortType,
    sortBy: AirdropSortBy,
    isSettlement: boolean | null,
    filterBy: AirdropFilterType | null,
    filter: unknown,
  ): RxJS.Observable<FindAllType<SocialAirdropEntity>> {
    return RxJS.merge(
      RxJS.of(filterBy).pipe(
        RxJS.filter(filterByType => filterByType == AirdropFilterType.USER_ID),
        RxJS.concatMap(_ =>
          RxJS.merge(
            RxJS.of(isSettlement).pipe(
              RxJS.filter(isSettlementTx => isSettlementTx == null),
              RxJS.switchMap(_ => RxJS.from(this._entityManager.getRepository(SocialAirdropEntity)
                .findAndCount({
                  relations: [
                    'airdropRule',
                    'socialTracker',
                    'blockchainTx'
                  ],
                  join: {
                    alias: "airdrop",
                    leftJoinAndSelect: {
                      airdropRule: "airdrop.airdropRule",
                      socialTracker: "airdrop.socialTracker",
                      blockchainTx: "airdrop.blockchainTx",
                      socialEvent: "socialTracker.socialEvent",
                      socialProfile: "socialTracker.socialProfile",
                      user: "socialProfile.user",
                    },
                  },
                  loadEagerRelations: true,
                  where: {
                    socialTracker: {
                      socialProfile: {
                        user: {
                          id: filter as string
                        }
                      }
                    }
                  },
                  skip: offset,
                  take: limit,
                  order: {
                    [sortBy]: sortType,
                  },
                })
              ))
            ),
            RxJS.of(isSettlement).pipe(
              RxJS.filter(isSettlementTx => isSettlementTx === true),
              RxJS.switchMap(_ => RxJS.from(this._entityManager.getRepository(SocialAirdropEntity)
                .findAndCount({
                  relations: [
                    'airdropRule',
                    'socialTracker',
                    'blockchainTx'
                  ],
                  join: {
                    alias: "airdrop",
                    innerJoinAndSelect: {
                      airdropRule: "airdrop.airdropRule",
                      blockchainTx: "airdrop.blockchainTx",
                    },
                    leftJoinAndSelect: {
                      socialTracker: "airdrop.socialTracker",
                      socialEvent: "socialTracker.socialEvent",
                      socialProfile: "socialTracker.socialProfile",
                      user: "socialProfile.user",
                    }
                  },
                  loadEagerRelations: true,
                  where: {
                    socialTracker: {
                      socialProfile: {
                        user: {
                          id: filter as string
                        }
                      }
                    },
                  },
                  skip: offset,
                  take: limit,
                  order: {
                    [sortBy]: sortType,
                  },
                })
              ))
            ),
            RxJS.of(isSettlement).pipe(
              RxJS.filter(isSettlementTx => isSettlementTx === false),
              RxJS.switchMap(_ => RxJS.from(this._entityManager.getRepository(SocialAirdropEntity)
                .findAndCount({
                  relations: [
                    'airdropRule',
                    'socialTracker',
                    'blockchainTx'
                  ],
                  join: {
                    alias: "airdrop",
                    leftJoinAndSelect: {
                      airdropRule: "airdrop.airdropRule",
                      socialTracker: "airdrop.socialTracker",
                      blockchainTx: "airdrop.blockchainTx",
                      socialEvent: "socialTracker.socialEvent",
                      socialProfile: "socialTracker.socialProfile",
                      user: "socialProfile.user",
                    },
                  },
                  loadEagerRelations: true,
                  where: {
                    socialTracker: {
                      socialProfile: {
                        user: {
                          id: filter as string
                        }
                      }
                    },
                    blockchainTx: IsNull()
                  },
                  skip: offset,
                  take: limit,
                  order: {
                    [sortBy]: sortType,
                  },
                })
              ))
            )
          )
        )
      ),
      RxJS.of(filterBy).pipe(
        RxJS.filter(filterByType => filterByType == AirdropFilterType.SOCIAL_TYPE),
        RxJS.concatMap(_ =>
          RxJS.merge(
            RxJS.of(isSettlement).pipe(
              RxJS.filter(isSettlementTx => isSettlementTx === null),
              RxJS.switchMap( _ =>
                RxJS.from(this._entityManager.getRepository(SocialAirdropEntity)
                  .findAndCount({
                    relations: [
                      'airdropRule',
                      'socialTracker',
                      'blockchainTx'
                    ],
                    join: {
                      alias: "airdrop",
                      leftJoinAndSelect: {
                        airdropRule: "airdrop.airdropRule",
                        socialTracker: "airdrop.socialTracker",
                        blockchainTx: "airdrop.blockchainTx",
                        socialEvent: "socialTracker.socialEvent",
                        socialProfile: "socialTracker.socialProfile",
                        user: "socialProfile.user",
                      },
                    },
                    loadEagerRelations: true,
                    where: {
                      airdropRule: {
                        socialType: filter as SocialType
                      }
                    },
                    skip: offset,
                    take: limit,
                    order: {
                      [sortBy]: sortType,
                    },
                  })
                )
              )
            ),
            RxJS.of(isSettlement).pipe(
              RxJS.filter(isSettlementTx => isSettlementTx === true),
              RxJS.switchMap( _ =>
                RxJS.from(this._entityManager.getRepository(SocialAirdropEntity)
                  .findAndCount({
                    relations: [
                      'airdropRule',
                      'socialTracker',
                      'blockchainTx'
                    ],
                    join: {
                      alias: "airdrop",
                      innerJoinAndSelect: {
                        airdropRule: "airdrop.airdropRule",
                        socialTracker: "airdrop.socialTracker",
                        blockchainTx: "airdrop.blockchainTx",
                        socialEvent: "socialTracker.socialEvent",
                        socialProfile: "socialTracker.socialProfile",
                        user: "socialProfile.user",
                      },
                    },
                    loadEagerRelations: true,
                    where: {
                      airdropRule: {
                        socialType: filter as SocialType
                      }
                    },
                    skip: offset,
                    take: limit,
                    order: {
                      [sortBy]: sortType,
                    },
                  })
                )
              )
            ),
            RxJS.of(isSettlement).pipe(
              RxJS.filter(isSettlementTx => isSettlementTx === false),
              RxJS.switchMap( _ =>
                RxJS.from(this._entityManager.getRepository(SocialAirdropEntity)
                  .findAndCount({
                    relations: [
                      'airdropRule',
                      'socialTracker',
                      'blockchainTx'
                    ],
                    join: {
                      alias: "airdrop",
                      leftJoinAndSelect: {
                        airdropRule: "airdrop.airdropRule",
                        socialTracker: "airdrop.socialTracker",
                        socialEvent: "socialTracker.socialEvent",
                        socialProfile: "socialTracker.socialProfile",
                        user: "socialProfile.user",
                      },
                    },
                    loadEagerRelations: true,
                    where: {
                      airdropRule: {
                        socialType: filter as SocialType
                      },
                      blockchainTx: IsNull()
                    },
                    skip: offset,
                    take: limit,
                    order: {
                      [sortBy]: sortType,
                    },
                  })
                )
              )
            )
          )
        )
      ),
      RxJS.of(filterBy).pipe(
        RxJS.filter(filterByType => filterByType == AirdropFilterType.SOCIAL_ACTION),
        RxJS.concatMap(_ =>
          RxJS.merge(
            RxJS.of(isSettlement).pipe(
              RxJS.filter(isSettlementTx => isSettlementTx === null),
              RxJS.switchMap( _ =>
                RxJS.from(this._entityManager.getRepository(SocialAirdropEntity)
                  .findAndCount({
                    relations: [
                      'airdropRule',
                      'socialTracker',
                      'blockchainTx'
                    ],
                    join: {
                      alias: "airdrop",
                      leftJoinAndSelect: {
                        airdropRule: "airdrop.airdropRule",
                        socialTracker: "airdrop.socialTracker",
                        blockchainTx: "airdrop.blockchainTx",
                        socialEvent: "socialTracker.socialEvent",
                        socialProfile: "socialTracker.socialProfile",
                        user: "socialProfile.user",
                      },
                    },
                    loadEagerRelations: true,
                    where: {
                      socialTracker: {
                        actionType: filter as SocialActionType
                      }
                    },
                    skip: offset,
                    take: limit,
                    order: {
                      [sortBy]: sortType,
                    },
                  })
                )
              )
            ),
            RxJS.of(isSettlement).pipe(
              RxJS.filter(isSettlementTx => isSettlementTx === true),
              RxJS.switchMap( _ =>
                RxJS.from(this._entityManager.getRepository(SocialAirdropEntity)
                  .findAndCount({
                    relations: [
                      'airdropRule',
                      'socialTracker',
                      'blockchainTx'
                    ],
                    join: {
                      alias: "airdrop",
                      leftJoinAndSelect: {
                        airdropRule: "airdrop.airdropRule",
                        socialTracker: "airdrop.socialTracker",
                        blockchainTx: "airdrop.blockchainTx",
                        socialEvent: "socialTracker.socialEvent",
                        socialProfile: "socialTracker.socialProfile",
                        user: "socialProfile.user",
                      },
                    },
                    loadEagerRelations: true,
                    where: {
                      socialTracker: {
                        actionType: filter as SocialActionType
                      },
                      blockchainTx: Not(IsNull())
                    },
                    skip: offset,
                    take: limit,
                    order: {
                      [sortBy]: sortType,
                    },
                  })
                )
              )
            ),
            RxJS.of(isSettlement).pipe(
              RxJS.filter(isSettlementTx => isSettlementTx === false),
              RxJS.switchMap( _ =>
                RxJS.from(this._entityManager.getRepository(SocialAirdropEntity)
                  .findAndCount({
                    relations: [
                      'airdropRule',
                      'socialTracker',
                      'blockchainTx'
                    ],
                    join: {
                      alias: "airdrop",
                      leftJoinAndSelect: {
                        airdropRule: "airdrop.airdropRule",
                        socialTracker: "airdrop.socialTracker",
                        blockchainTx: "airdrop.blockchainTx",
                        socialEvent: "socialTracker.socialEvent",
                        socialProfile: "socialTracker.socialProfile",
                        user: "socialProfile.user",
                      },
                    },
                    loadEagerRelations: true,
                    where: {
                      socialTracker: {
                        actionType: filter as SocialActionType
                      },
                      blockchainTx: IsNull()
                    },
                    skip: offset,
                    take: limit,
                    order: {
                      [sortBy]: sortType,
                    },
                  })
                )
              )
            )
          )
        )
      ),
      RxJS.of(filterBy).pipe(
        RxJS.filter(filterByType => !filterByType),
        RxJS.concatMap(_ =>
          RxJS.merge(
            RxJS.of(isSettlement).pipe(
              RxJS.filter(isSettlementTx => isSettlementTx == null),
              RxJS.switchMap( _ =>
                RxJS.from(this._entityManager.getRepository(SocialAirdropEntity)
                  .findAndCount({
                    relations: {
                      airdropRule: true,
                      blockchainTx: true,
                      socialTracker: true,
                    },
                    join: {
                      alias: "airdrop",
                      leftJoinAndSelect: {
                        airdropRule: "airdrop.airdropRule",
                        socialTracker: "airdrop.socialTracker",
                        blockchainTx: "airdrop.blockchainTx",
                        socialEvent: "socialTracker.socialEvent",
                        socialProfile: "socialTracker.socialProfile",
                        user: "socialProfile.user",
                      },
                    },
                    loadEagerRelations: true,
                    skip: offset,
                    take: limit,
                    order: {
                      [sortBy]: sortType,
                    },
                  })
                )
              )
            ),
            RxJS.of(isSettlement).pipe(
              RxJS.filter(isSettlementTx => isSettlementTx === true),
              RxJS.switchMap( _ =>
                RxJS.from(this._entityManager.getRepository(SocialAirdropEntity)
                  .findAndCount({
                    relations: [
                      'airdropRule',
                      'socialTracker',
                      'blockchainTx'
                    ],
                    join: {
                      alias: "airdrop",
                      innerJoinAndSelect: {
                        airdropRule: "airdrop.airdropRule",
                        socialTracker: "airdrop.socialTracker",
                        blockchainTx: "airdrop.blockchainTx",
                        socialEvent: "socialTracker.socialEvent",
                        socialProfile: "socialTracker.socialProfile",
                        user: "socialProfile.user",
                      },
                    },
                    loadEagerRelations: true,
                    skip: offset,
                    take: limit,
                    order: {
                      [sortBy]: sortType,
                    },
                  })
                )
              )
            ),
            RxJS.of(isSettlement).pipe(
              RxJS.filter(isSettlementTx => isSettlementTx === false),
              RxJS.switchMap( _ =>
                RxJS.from(this._entityManager.getRepository(SocialAirdropEntity)
                  .findAndCount({
                    relations: [
                      'airdropRule',
                      'socialTracker',
                      'blockchainTx'
                    ],
                    join: {
                      alias: "airdrop",
                      leftJoinAndSelect: {
                        airdropRule: "airdrop.airdropRule",
                        socialTracker: "airdrop.socialTracker",
                        blockchainTx: "airdrop.blockchainTx",
                        socialEvent: "socialTracker.socialEvent",
                        socialProfile: "socialTracker.socialProfile",
                        user: "socialProfile.user",
                      },
                    },
                    loadEagerRelations: true,
                    where: {
                      blockchainTx: IsNull(),
                    },
                    skip: offset,
                    take: limit,
                    order: {
                      [sortBy]: sortType,
                    },
                  })
                )
              )
            )
          )
        )
      )
    ).pipe(
      RxJS.tap({
        next: result => this._logger.debug(`findAll SocialAirdrop success, total: ${result[1]}`),
        error: err => this._logger.error(`findAll SocialAirdrop failed`, err)
      }),
      RxJS.map(result => ({data: result[0], total: result[1]})),
      RxJS.catchError((_) => RxJS.throwError(() => new HttpException(
        {
          statusCode: '500',
          message: 'Something Went Wrong',
          error: 'Internal Server Error'
        }, HttpStatus.INTERNAL_SERVER_ERROR))
      )
    )
  }

  findUserBalance(
    userId: string,
    filterBy: AirdropUserFilterType,
    filter: unknown,
  ): RxJS.Observable<AirdropUserBalance | null> {
    return RxJS.merge(
      RxJS.of(filter).pipe(
        RxJS.filter(filterVal => !filterVal || !filterBy),
        RxJS.concatMap(_ =>
          RxJS.from(this._entityManager.createQueryBuilder(UserEntity, "users")
            .select('"users"."id" as "userId", "users"."email" as "email"')
            .addSelect('COALESCE("sub1"."airdrops", 0) as "pending", COALESCE("sub2"."airdrops", 0) as "settlement"')
            .addSelect('COALESCE("sub1"."airdrops",0) + COALESCE("sub2"."airdrops",0) as "total"')
            .leftJoin(qb =>
                qb.select('"users"."id" as "userId", sum("airdropRule"."amount"::numeric) as "airdrops"')
                  .from(SocialAirdropEntity, "airdrop")
                  .innerJoin("social_airdrop_rule", "airdropRule", '"airdropRule"."id" = "airdrop"."airdropRuleId"')
                  .innerJoin("social_tracker", "tracker", '"tracker"."id" = "airdrop"."socialTrackerId"')
                  .innerJoin("social_profile", "profile",  '"profile"."id" = "tracker"."socialProfileId"')
                  .innerJoin("user" , "users" ,'"users"."id" = "profile"."userId"')
                  .where('"airdrop"."blockchainTxId" IS NULL')
                  .andWhere('"users"."id" = :userid', {userid: userId})
                  .groupBy('"users"."id"')
              , "sub1", '"sub1"."userId" = "users"."id"')
            .leftJoin(qb =>
                qb.select('"users"."id" as "userId", sum("airdropRule"."amount"::numeric) as "airdrops"')
                  .from(SocialAirdropEntity, "airdrop")
                  .innerJoin("social_airdrop_rule", "airdropRule", '"airdropRule"."id" = "airdrop"."airdropRuleId"')
                  .innerJoin("social_tracker", "tracker", '"tracker"."id" = "airdrop"."socialTrackerId"')
                  .innerJoin("social_profile", "profile",  '"profile"."id" = "tracker"."socialProfileId"')
                  .innerJoin("user" , "users" ,'"users"."id" = "profile"."userId"')
                  .where('"airdrop"."blockchainTxId" IS NOT NULL')
                  .andWhere('"users"."id" = :userid', {userid: userId})
                  .groupBy('"users"."id"')
              , "sub2", '"sub2"."userId" = "users"."id"')
            .where('"users"."id" = :userid', {userid: userId})
            .getRawOne()
          ).pipe(
            RxJS.tap( {
              error: (error) => this._logger.error(`findUserBalance without any filter failed, userId: ${userId}`, error),
            }),
            RxJS.mergeMap((queryResult) =>
              RxJS.merge(
                RxJS.of(queryResult).pipe(
                  RxJS.filter((queryResult) => !queryResult ),
                  RxJS.tap( {
                    next: (_) => this._logger.debug(`findUserBalance without any filter not found, userId: ${userId}`),
                  }),
                  RxJS.map(_ =>  null)
                ),
                RxJS.of(queryResult).pipe(
                  RxJS.filter((queryResult) => !!queryResult ),
                  RxJS.tap( {
                    next: (queryResult) => this._logger.debug(`findUserBalance without any filter, userId: ${userId}, total: ${queryResult.length}`),
                  }),
                  RxJS.identity
                ),
              )
            ),
          )
        )
      ),
      RxJS.of(filter).pipe(
        RxJS.filter(filterVal => !!filterVal),
        RxJS.mergeMap(_ =>
          RxJS.merge(
            RxJS.of(filterBy).pipe(
              RxJS.filter(filterByType => filterByType == AirdropUserFilterType.SOCIAL_TYPE),
              RxJS.concatMap(_ =>
                RxJS.from(this._entityManager.createQueryBuilder(UserEntity, "users")
                  .select('"users"."id" as "userId", "users"."email" as "email"')
                  .addSelect('COALESCE("sub1"."airdrops", 0) as "pending", COALESCE("sub2"."airdrops", 0) as "settlement"')
                  .addSelect('COALESCE("sub1"."airdrops",0) + COALESCE("sub2"."airdrops",0) as "total"')
                  .leftJoin(qb =>
                      qb.select('"users"."id" as "userId", sum("airdropRule"."amount"::numeric) as "airdrops"')
                        .from(SocialAirdropEntity, "airdrop")
                        .innerJoin("social_airdrop_rule", "airdropRule", '"airdropRule"."id" = "airdrop"."airdropRuleId"')
                        .innerJoin("social_tracker", "tracker", '"tracker"."id" = "airdrop"."socialTrackerId"')
                        .innerJoin("social_profile", "profile",  '"profile"."id" = "tracker"."socialProfileId"')
                        .innerJoin("user" , "users" ,'"users"."id" = "profile"."userId"')
                        .where('"airdrop"."blockchainTxId" IS NULL')
                        .andWhere('"users"."id" = :userid', {userid: userId})
                        .andWhere('"airdropRule"."socialType" = :socialType', {socialType: filter})
                        .groupBy('"users"."id"')
                    , "sub1", '"sub1"."userId" = "users"."id"')
                  .leftJoin(qb =>
                      qb.select('"users"."id" as "userId", sum("airdropRule"."amount"::numeric) as "airdrops"')
                        .from(SocialAirdropEntity, "airdrop")
                        .innerJoin("social_airdrop_rule", "airdropRule", '"airdropRule"."id" = "airdrop"."airdropRuleId"')
                        .innerJoin("social_tracker", "tracker", '"tracker"."id" = "airdrop"."socialTrackerId"')
                        .innerJoin("social_profile", "profile",  '"profile"."id" = "tracker"."socialProfileId"')
                        .innerJoin("user" , "users" ,'"users"."id" = "profile"."userId"')
                        .where('"airdrop"."blockchainTxId" IS NOT NULL')
                        .andWhere('"users"."id" = :userid', {userid: userId})
                        .andWhere('"airdropRule"."socialType" = :socialType', {socialType: filter})
                        .groupBy('"users"."id"')
                    , "sub2", '"sub2"."userId" = "users"."id"')
                  .where('"users"."id" = :userid', {userid: userId})
                  .getRawOne()
                ).pipe(
                  RxJS.tap( {
                    error: (error) => this._logger.error(`findUserBalance by socialType filter failed, socialType: ${filter}`, error),
                  }),
                  RxJS.mergeMap((queryResult) =>
                    RxJS.merge(
                      RxJS.of(queryResult).pipe(
                        RxJS.filter((queryResult) => !queryResult ),
                        RxJS.tap( {
                          next: (_) => this._logger.debug(`findUserBalance by socialType filter not found, socialType: ${filter}`),
                        }),
                        RxJS.map(_ => null)
                      ),
                      RxJS.of(queryResult).pipe(
                        RxJS.filter((queryResult) => !!queryResult ),
                        RxJS.tap( {
                          next: (queryResult) => this._logger.debug(`findUserBalance by socialType filter found, socialType: ${filter}, result: ${JSON.stringify(queryResult)}`),
                        }),
                        RxJS.identity
                      ),
                    )
                  ),
                )
              )
            ),
            RxJS.of(filterBy).pipe(
              RxJS.filter(filterByType => filterByType == AirdropUserFilterType.SOCIAL_ACTION),
              RxJS.concatMap(_ =>
                RxJS.from(this._entityManager.createQueryBuilder(UserEntity, "users")
                  .select('"users"."id" as "userId", "users"."email" as "email"')
                  .addSelect('COALESCE("sub1"."airdrops", 0) as "pending", COALESCE("sub2"."airdrops", 0) as "settlement"')
                  .addSelect('COALESCE("sub1"."airdrops",0) + COALESCE("sub2"."airdrops",0) as "total"')
                  .leftJoin(qb =>
                      qb.select('"users"."id" as "userId", sum("airdropRule"."amount"::numeric) as "airdrops"')
                        .from(SocialAirdropEntity, "airdrop")
                        .innerJoin("social_airdrop_rule", "airdropRule", '"airdropRule"."id" = "airdrop"."airdropRuleId"')
                        .innerJoin("social_tracker", "tracker", '"tracker"."id" = "airdrop"."socialTrackerId"')
                        .innerJoin("social_profile", "profile",  '"profile"."id" = "tracker"."socialProfileId"')
                        .innerJoin("user" , "users" ,'"users"."id" = "profile"."userId"')
                        .where('"airdrop"."blockchainTxId" IS NULL')
                        .andWhere('"users"."id" = :userid', {userid: userId})
                        .andWhere('"airdropRule"."actionType" = :actionType', {actionType: filter})
                        .groupBy('"users"."id"')
                    , "sub1", '"sub1"."userId" = "users"."id"')
                  .leftJoin(qb =>
                      qb.select('"users"."id" as "userId", sum("airdropRule"."amount"::numeric) as "airdrops"')
                        .from(SocialAirdropEntity, "airdrop")
                        .innerJoin("social_airdrop_rule", "airdropRule", '"airdropRule"."id" = "airdrop"."airdropRuleId"')
                        .innerJoin("social_tracker", "tracker", '"tracker"."id" = "airdrop"."socialTrackerId"')
                        .innerJoin("social_profile", "profile",  '"profile"."id" = "tracker"."socialProfileId"')
                        .innerJoin("user" , "users" ,'"users"."id" = "profile"."userId"')
                        .where('"airdrop"."blockchainTxId" IS NOT NULL')
                        .andWhere('"users"."id" = :userid', {userid: userId})
                        .andWhere('"airdropRule"."actionType" = :actionType', {actionType: filter})
                        .groupBy('"users"."id"')
                    , "sub2", '"sub2"."userId" = "users"."id"')
                  .where('"users"."id" = :userid', {userid: userId})
                  .getRawOne()
                ).pipe(
                  RxJS.tap( {
                    error: (error) => this._logger.error(`findUserBalance by actionType filter failed, userId: ${userId}, actionType: ${filter}`, error),
                  }),
                  RxJS.mergeMap((queryResult) =>
                    RxJS.merge(
                      RxJS.of(queryResult).pipe(
                        RxJS.filter((queryResult) => !queryResult ),
                        RxJS.tap( {
                          next: (_) => this._logger.debug(`findUserBalance by actionType filter not found, userId: ${userId}, socialType: ${filter}`),
                        }),
                        RxJS.map(_ => null)
                      ),
                      RxJS.of(queryResult).pipe(
                        RxJS.filter((queryResult) => !!queryResult ),
                        RxJS.tap( {
                          next: (queryResult) => this._logger.debug(`findUserBalance by actionType filter found, userId: ${userId}, actionType: ${filter}, result: ${JSON.stringify(queryResult)}`),
                        }),
                        RxJS.identity
                      ),
                    )
                  ),
                )
              )
            ),
          )
        )
      ),
    ).pipe(
      RxJS.tap( {
        error: (error) => this._logger.error(`findUserBalance failed, userId: ${userId}, filterBy: ${filterBy} filter: ${filter} `, error),
      }),
      RxJS.catchError((_) => RxJS.throwError(() => new HttpException(
        {
          statusCode: '500',
          message: 'Something Went Wrong',
          error: 'Internal Server Error'
        }, HttpStatus.INTERNAL_SERVER_ERROR))
      )
    )
  }

  findAllBalance(
    offset: number,
    limit: number,
    sortType: SortType,
    sortBy: BalanceSortBy,
    filterBy: AirdropFilterType,
    filter: unknown,
  ): RxJS.Observable<FindAllBalanceType> {
    return RxJS.merge(
      RxJS.of(filterBy).pipe(
        RxJS.filter(filterByType => filterByType == AirdropFilterType.USER_ID),
        RxJS.mergeMap(_ =>
          RxJS.merge(
            RxJS.of(filter).pipe(
              RxJS.filter(filterVal => !!filterVal),
              RxJS.concatMap(filterVal =>
                RxJS.from(this._entityManager.createQueryBuilder(UserEntity, "users")
                  .select('"users"."id" as "userId", "users"."email" as "email"')
                  .addSelect('COALESCE("sub1"."airdrops", 0) as "pending", COALESCE("sub2"."airdrops", 0) as "settlement"')
                  .addSelect('COALESCE("sub1"."airdrops",0) + COALESCE("sub2"."airdrops",0) as "total"')
                  .leftJoin(qb =>
                      qb.select('"users"."id" as "userId", sum("airdropRule"."amount"::numeric) as "airdrops"')
                        .from(SocialAirdropEntity, "airdrop")
                        .innerJoin("social_airdrop_rule", "airdropRule", '"airdropRule"."id" = "airdrop"."airdropRuleId"')
                        .innerJoin("social_tracker", "tracker", '"tracker"."id" = "airdrop"."socialTrackerId"')
                        .innerJoin("social_profile", "profile",  '"profile"."id" = "tracker"."socialProfileId"')
                        .innerJoin("user" , "users" ,'"users"."id" = "profile"."userId"')
                        .where('"airdrop"."blockchainTxId" IS NULL')
                        .andWhere('"users"."id" = :userid', {userid: filterVal})
                        .groupBy('"users"."id"')
                    , "sub1", '"sub1"."userId" = "users"."id"')
                  .leftJoin(qb =>
                      qb.select('"users"."id" as "userId", sum("airdropRule"."amount"::numeric) as "airdrops"')
                        .from(SocialAirdropEntity, "airdrop")
                        .innerJoin("social_airdrop_rule", "airdropRule", '"airdropRule"."id" = "airdrop"."airdropRuleId"')
                        .innerJoin("social_tracker", "tracker", '"tracker"."id" = "airdrop"."socialTrackerId"')
                        .innerJoin("social_profile", "profile",  '"profile"."id" = "tracker"."socialProfileId"')
                        .innerJoin("user" , "users" ,'"users"."id" = "profile"."userId"')
                        .where('"airdrop"."blockchainTxId" IS NOT NULL')
                        .andWhere('"users"."id" = :userid', {userid: filterVal})
                        .groupBy('"users"."id"')
                    , "sub2", '"sub2"."userId" = "users"."id"')
                  .where('"users"."id" = :userid', {userid: filterVal})
                  .getRawOne()
                ).pipe(
                  RxJS.tap( {
                    error: (error) => this._logger.error(`findAllBalance by userId filter failed, userId: ${filterVal}`, error),
                  }),
                  RxJS.mergeMap((queryResult) =>
                    RxJS.merge(
                      RxJS.of(queryResult).pipe(
                        RxJS.filter((queryResult) => !queryResult ),
                        RxJS.tap( {
                          next: (_) => this._logger.debug(`findAllBalance by userId filter not found, userId: ${filterVal}`),
                        }),
                        RxJS.map(_ => ({data: null, total: 0}) )
                      ),
                      RxJS.of(queryResult).pipe(
                        RxJS.filter((queryResult) => !!queryResult ),
                        RxJS.tap( {
                          next: (queryResult) => this._logger.debug(`findAllBalance by userId filter found, userId: ${filterVal}, result: ${queryResult}`),
                        }),
                        RxJS.map(queryResult => ({data: [queryResult], total: 1}) )
                      ),
                    )
                  ),
                )
              )
            ),
            RxJS.of(filter).pipe(
              RxJS.filter(filterVal => !filterVal),
              RxJS.concatMap(_ =>
                RxJS.from(this._entityManager.createQueryBuilder()
                  .select("*")
                  .from(subQuery => subQuery.select('"users"."id" as "userId", "users"."email" as "email"')
                      .addSelect('COALESCE("sub1"."airdrops", 0) as "pending", COALESCE("sub2"."airdrops", 0) as "settlement"')
                      .addSelect('COALESCE("sub1"."airdrops",0) + COALESCE("sub2"."airdrops",0) as "total"')
                      .leftJoin(qb =>
                          qb.select('"users"."id" as "userId", sum("airdropRule"."amount"::numeric) as "airdrops"')
                            .from(SocialAirdropEntity, "airdrop")
                            .innerJoin("social_airdrop_rule", "airdropRule", '"airdropRule"."id" = "airdrop"."airdropRuleId"')
                            .innerJoin("social_tracker", "tracker", '"tracker"."id" = "airdrop"."socialTrackerId"')
                            .innerJoin("social_profile", "profile",  '"profile"."id" = "tracker"."socialProfileId"')
                            .innerJoin("user" , "users" ,'"users"."id" = "profile"."userId"')
                            .where('"airdrop"."blockchainTxId" IS NULL')
                            .groupBy('"users"."id"')
                        , "sub1", '"sub1"."userId" = "users"."id"')
                      .leftJoin(qb =>
                          qb.select('"users"."id" as "userId", sum("airdropRule"."amount"::numeric) as "airdrops"')
                            .from(SocialAirdropEntity, "airdrop")
                            .innerJoin("social_airdrop_rule", "airdropRule", '"airdropRule"."id" = "airdrop"."airdropRuleId"')
                            .innerJoin("social_tracker", "tracker", '"tracker"."id" = "airdrop"."socialTrackerId"')
                            .innerJoin("social_profile", "profile",  '"profile"."id" = "tracker"."socialProfileId"')
                            .innerJoin("user" , "users" ,'"users"."id" = "profile"."userId"')
                            .where('"airdrop"."blockchainTxId" IS NOT NULL')
                            .groupBy('"users"."id"')
                        , "sub2", '"sub2"."userId" = "users"."id"')
                      .from(UserEntity, "users")
                  , "balance")
                  .where('"balance"."total" > 0')
                  .skip(offset)
                  .limit(limit)
                  .orderBy(sortBy ? sortBy.toLowerCase(): null, sortType)
                  .getRawMany()
                ).pipe(
                  RxJS.tap( {
                    error: (error) => this._logger.error(`findAllBalance group by userId filter failed`, error),
                  }),
                  RxJS.mergeMap((queryResult) =>
                    RxJS.merge(
                      RxJS.of(queryResult).pipe(
                        RxJS.filter((queryResult) => !queryResult ),
                        RxJS.tap( {
                          next: (_) => this._logger.debug(`findAllBalance group by userId filter not found`),
                        }),
                        RxJS.map(_ => ({data: null, total: 0}) )
                      ),
                      RxJS.of(queryResult).pipe(
                        RxJS.filter((queryResult) => !!queryResult ),
                        RxJS.tap( {
                          next: (queryResult) => this._logger.debug(`findAllBalance group by userId filter success, total: ${queryResult.length}`),
                        }),
                        RxJS.map(queryResult => ({data: queryResult, total: queryResult.length}) )
                      ),
                    )
                  ),
                )
              )
            ),
          )
        )
      ),
      RxJS.of(filterBy).pipe(
        RxJS.filter(filterByType => filterByType == AirdropFilterType.SOCIAL_TYPE),
        RxJS.mergeMap(_ =>
          RxJS.merge(
            RxJS.of(filter).pipe(
              RxJS.filter(filterVal => !!filterVal),
              RxJS.concatMap(filterVal =>
                RxJS.from(this._entityManager.createQueryBuilder(SocialLivelyEntity, "lively")
                  .select('"lively"."socialType" as "socialType"')
                  .addSelect('COALESCE("sub1"."airdrops",0) as "pending", COALESCE("sub2"."airdrops",0) as "settlement"')
                  .addSelect('COALESCE("sub1"."airdrops",0) + COALESCE("sub2"."airdrops",0) as "total"')
                  .leftJoin(qb =>
                      qb.select('sum("airdropRule"."amount"::numeric) as "airdrops"')
                        .addSelect('"airdropRule"."socialType" as "socialType"')
                        .from(SocialAirdropEntity, "airdrop")
                        .innerJoin("social_airdrop_rule", "airdropRule", '"airdropRule"."id" = "airdrop"."airdropRuleId"')
                        .where('"airdrop"."blockchainTxId" IS NULL')
                        .andWhere('"airdropRule"."socialType" = :socialType', {socialType: filterVal})
                        .groupBy('"airdropRule"."socialType"')
                    , "sub1", '"sub1"."socialType" = "lively"."socialType"')
                  .leftJoin(qb =>
                      qb.select('sum("airdropRule"."amount"::numeric) as "airdrops"')
                        .addSelect('"airdropRule"."socialType" as "socialType"')
                        .from(SocialAirdropEntity, "airdrop")
                        .innerJoin("social_airdrop_rule", "airdropRule", '"airdropRule"."id" = "airdrop"."airdropRuleId"')
                        .where('"airdrop"."blockchainTxId" IS NOT NULL')
                        .andWhere('"airdropRule"."socialType" = :socialType', {socialType: filterVal})
                        .groupBy('"airdropRule"."socialType"')
                    , "sub2", '"sub2"."socialType" = "lively"."socialType"')
                  .where('"lively"."socialType" = :socialType', {socialType: filterVal})
                  .getRawOne()
                ).pipe(
                  RxJS.tap( {
                    error: (error) => this._logger.error(`findAllBalance by socialType filter failed, socialType: ${filterVal}`, error),
                  }),
                  RxJS.mergeMap((queryResult) =>
                    RxJS.merge(
                      RxJS.of(queryResult).pipe(
                        RxJS.filter((queryResult) => !queryResult ),
                        RxJS.tap( {
                          next: (_) => this._logger.debug(`findAllBalance by socialType filter not found, socialType: ${filterVal}`),
                        }),
                        RxJS.map(_ => ({data: null, total: 0}) )
                      ),
                      RxJS.of(queryResult).pipe(
                        RxJS.filter((queryResult) => !!queryResult ),
                        RxJS.tap( {
                          next: (queryResult) => this._logger.debug(`findAllBalance by socialType filter found, socialType: ${filterVal}, result: ${JSON.stringify(queryResult)}`),
                        }),
                        RxJS.map(queryResult => ({data: [queryResult], total: 1}) )
                      ),
                    )
                  ),
                )
              )
            ),
            RxJS.of(filter).pipe(
              RxJS.filter(filterVal => !filterVal),
              RxJS.concatMap(_ =>
                RxJS.from(this._entityManager.createQueryBuilder(SocialLivelyEntity, "lively")
                  .select('"lively"."socialType" as "socialType"')
                  .addSelect('COALESCE("sub1"."airdrops",0) as "pending", COALESCE("sub2"."airdrops",0) as "settlement"')
                  .addSelect('COALESCE("sub1"."airdrops",0) + COALESCE("sub2"."airdrops",0) as "total"')
                  .leftJoin(qb =>
                      qb.select('sum("airdropRule"."amount"::numeric) as "airdrops"')
                        .addSelect('"airdropRule"."socialType" as "socialType"')
                        .from(SocialAirdropEntity, "airdrop")
                        .innerJoin("social_airdrop_rule", "airdropRule", '"airdropRule"."id" = "airdrop"."airdropRuleId"')
                        .where('"airdrop"."blockchainTxId" IS NULL')
                        .groupBy('"airdropRule"."socialType"')
                    , "sub1", '"sub1"."socialType" = "lively"."socialType"')
                  .leftJoin(qb =>
                      qb.select('sum("airdropRule"."amount"::numeric) as "airdrops"')
                        .addSelect('"airdropRule"."socialType" as "socialType"')
                        .from(SocialAirdropEntity, "airdrop")
                        .innerJoin("social_airdrop_rule", "airdropRule", '"airdropRule"."id" = "airdrop"."airdropRuleId"')
                        .where('"airdrop"."blockchainTxId" IS NOT NULL')
                        .groupBy('"airdropRule"."socialType"')
                    , "sub2", '"sub2"."socialType" = "lively"."socialType"')
                  .skip(offset)
                  .limit(limit)
                  .orderBy(sortBy ? sortBy.toLowerCase(): null, sortType)
                  .getRawMany()
                ).pipe(
                  RxJS.tap( {
                    error: (error) => this._logger.error(`findAllBalance group by socialType filter failed`, error),
                  }),
                  RxJS.mergeMap((queryResult) =>
                    RxJS.merge(
                      RxJS.of(queryResult).pipe(
                        RxJS.filter((queryResult) => !queryResult ),
                        RxJS.tap( {
                          next: (_) => this._logger.debug(`findAllBalance group by socialType filter not found`),
                        }),
                        RxJS.map(_ => ({data: null, total: 0}) )
                      ),
                      RxJS.of(queryResult).pipe(
                        RxJS.filter((queryResult) => !!queryResult ),
                        RxJS.tap( {
                          next: (queryResult) => this._logger.debug(`findAllBalance by socialType filter found, total: ${queryResult.length}`),
                        }),
                        RxJS.map(queryResult => ({data: queryResult, total: queryResult.length}) )
                      ),
                    )
                  ),
                )
              )
            )
          )
        ),
      ),
      RxJS.of(filterBy).pipe(
        RxJS.filter(filterByType => filterByType == AirdropFilterType.SOCIAL_ACTION),
        RxJS.mergeMap(_ =>
          RxJS.merge(
            RxJS.of(filter).pipe(
              RxJS.filter(filterVal => !!filterVal),
              RxJS.concatMap(filterVal =>
                RxJS.from(this._entityManager.createQueryBuilder(SocialAirdropRuleEntity, "airdropRule")
                  .select('"airdropRule"."actionType" as "actionType"')
                  .addSelect('COALESCE("sub1"."airdrops",0) as "pending", COALESCE("sub2"."airdrops",0) as "settlement"')
                  .addSelect('COALESCE("sub1"."airdrops",0) + COALESCE("sub2"."airdrops",0) as "total"')
                  .leftJoin(qb =>
                      qb.select('sum("airdropRule"."amount"::numeric) as "airdrops"')
                        .addSelect('"tracker"."actionType" as "actionType"')
                        .from(SocialAirdropEntity, "airdrop")
                        .innerJoin("social_airdrop_rule", "airdropRule", '"airdropRule"."id" = "airdrop"."airdropRuleId"')
                        .innerJoin("social_tracker", "tracker", '"tracker"."id" = "airdrop"."socialTrackerId"')
                        .where('"airdrop"."blockchainTxId" IS NULL')
                        .andWhere('"tracker"."actionType" = :actionType', {actionType: filterVal})
                        .groupBy('"tracker"."actionType"')
                    , "sub1", '"sub1"."actionType" = "airdropRule"."actionType"')
                  .leftJoin(qb =>
                      qb.select('sum("airdropRule"."amount"::numeric) as "airdrops"')
                        .addSelect('"tracker"."actionType" as "actionType"')
                        .from(SocialAirdropEntity, "airdrop")
                        .innerJoin("social_airdrop_rule", "airdropRule", '"airdropRule"."id" = "airdrop"."airdropRuleId"')
                        .innerJoin("social_tracker", "tracker", '"tracker"."id" = "airdrop"."socialTrackerId"')
                        .where('"airdrop"."blockchainTxId" IS NOT NULL')
                        .andWhere('"tracker"."actionType" = :actionType', {actionType: filterVal})
                        .groupBy('"tracker"."actionType"')
                    , "sub2", '"sub2"."actionType" = "airdropRule"."actionType"')
                  .where('"airdropRule"."actionType" = :actionType', {actionType: filterVal})
                  .getRawOne()
                ).pipe(
                  RxJS.tap( {
                    error: (error) => this._logger.error(`findAllBalance by actionType filter failed, actionType: ${filterVal}`, error),
                  }),
                  RxJS.mergeMap((queryResult) =>
                    RxJS.merge(
                      RxJS.of(queryResult).pipe(
                        RxJS.filter((queryResult) => !queryResult ),
                        RxJS.tap( {
                          next: (_) => this._logger.debug(`findAllBalance by actionType filter not found, socialType: ${filterVal}`),
                        }),
                        RxJS.map(_ => ({data: null, total: 0}) )
                      ),
                      RxJS.of(queryResult).pipe(
                        RxJS.filter((queryResult) => !!queryResult ),
                        RxJS.tap( {
                          next: (queryResult) => this._logger.debug(`findAllBalance by actionType filter found, actionType: ${filterVal}, result: ${JSON.stringify(queryResult)}`),
                        }),
                        RxJS.map(queryResult => ({data: [queryResult], total: 1}) )
                      ),
                    )
                  ),
                )
              )
            ),
            RxJS.of(filter).pipe(
              RxJS.filter(filterVal => !filterVal),
              RxJS.concatMap(_ =>
                RxJS.from(this._entityManager.createQueryBuilder(SocialAirdropRuleEntity, "airdropRule")
                  .select('"airdropRule"."actionType" as "actionType"')
                  .addSelect('COALESCE("sub1"."airdrops", 0) as "pending", COALESCE("sub2"."airdrops",0) as "settlement"')
                  .addSelect('COALESCE("sub1"."airdrops",0) + COALESCE("sub2"."airdrops",0) as "total"')
                  .leftJoin(qb =>
                      qb.select('sum("airdropRule"."amount"::numeric) as "airdrops"')
                        .addSelect('"tracker"."actionType" as "actionType"')
                        .from(SocialAirdropEntity, "airdrop")
                        .innerJoin("social_airdrop_rule", "airdropRule", '"airdropRule"."id" = "airdrop"."airdropRuleId"')
                        .innerJoin("social_tracker", "tracker", '"tracker"."id" = "airdrop"."socialTrackerId"')
                        .where('"airdrop"."blockchainTxId" IS NULL')
                        .groupBy('"tracker"."actionType"')
                    , "sub1", '"sub1"."actionType" = "airdropRule"."actionType"')
                  .leftJoin(qb =>
                      qb.select('sum("airdropRule"."amount"::numeric) as "airdrops"')
                        .addSelect('"tracker"."actionType" as "actionType"')
                        .from(SocialAirdropEntity, "airdrop")
                        .innerJoin("social_airdrop_rule", "airdropRule", '"airdropRule"."id" = "airdrop"."airdropRuleId"')
                        .innerJoin("social_tracker", "tracker", '"tracker"."id" = "airdrop"."socialTrackerId"')
                        .where('"airdrop"."blockchainTxId" IS NOT NULL')
                        .groupBy('"tracker"."actionType"')
                    , "sub2", '"sub2"."actionType" = "airdropRule"."actionType"')
                  .skip(offset)
                  .limit(limit)
                  .orderBy(sortBy ? sortBy.toLowerCase(): null, sortType)
                  .getRawMany()
                ).pipe(
                  RxJS.tap( {
                    error: (error) => this._logger.error(`findAllBalance group by actionType filter failed`, error),
                  }),
                  RxJS.mergeMap((queryResult) =>
                    RxJS.merge(
                      RxJS.of(queryResult).pipe(
                        RxJS.filter((queryResult) => !queryResult ),
                        RxJS.tap( {
                          next: (_) => this._logger.debug(`findAllBalance group by actionType filter not found`),
                        }),
                        RxJS.map(_ => ({data: null, total: 0}) )
                      ),
                      RxJS.of(queryResult).pipe(
                        RxJS.filter((queryResult) => !!queryResult ),
                        RxJS.tap( {
                          next: (queryResult) => this._logger.debug(`findAllBalance by actionType filter found, total: ${queryResult.length}`),
                        }),
                        RxJS.map(queryResult => ({data: queryResult, total: queryResult.length}) )
                      ),
                    )
                  ),
                )
              )
            )
          )
        ),
      ),
      RxJS.of(filterBy).pipe(
        RxJS.filter(filterByType => !filterByType),
        RxJS.concatMap(_ =>
          RxJS.from(this._entityManager.createQueryBuilder()
            .select('COALESCE("balance"."pending", 0) as "pending", COALESCE("balance"."settlement", 0) as "settlement"')
            .addSelect('COALESCE("balance"."pending",0) + COALESCE("balance"."settlement",0) as "total"')
            .from(subQuery => subQuery.select(qb =>
                qb.select('sum("airdropRule"."amount"::numeric) as "airdrops"')
                  .from(SocialAirdropEntity, "airdrop")
                  .innerJoin("social_airdrop_rule", "airdropRule", '"airdropRule"."id" = "airdrop"."airdropRuleId"')
                  .where('"airdrop"."blockchainTxId" IS NULL')
                  .groupBy('"airdrop"."isActive"')
              , "pending")
            .addSelect(qb =>
                qb.select('sum("airdropRule"."amount"::numeric) as "airdrops"')
                  .from(SocialAirdropEntity, "airdrop")
                  .innerJoin("social_airdrop_rule", "airdropRule", '"airdropRule"."id" = "airdrop"."airdropRuleId"')
                  .where('"airdrop"."blockchainTxId" IS NOT NULL')
                  .groupBy('"airdrop"."isActive"')
              , "settlement")
            .from(SocialAirdropRuleEntity, "airdropRule")
            , "balance")
            .getRawOne()
          ).pipe(
            RxJS.tap( {
              error: (error) => this._logger.error(`findAllBalance failed`, error),
            }),
            RxJS.mergeMap((queryResult) =>
              RxJS.merge(
                RxJS.of(queryResult).pipe(
                  RxJS.filter((queryResult) => !queryResult ),
                  RxJS.tap( {
                    next: (_) => this._logger.debug(`findAllBalance filter not found`),
                  }),
                  RxJS.mergeMap((_) => RxJS.EMPTY)
                ),
                RxJS.of(queryResult).pipe(
                  RxJS.filter((queryResult) => !!queryResult ),
                  RxJS.tap( {
                    next: (queryResult) => this._logger.debug(`findAllBalance found, result: ${JSON.stringify(queryResult)}`),
                  }),
                  RxJS.map(queryResult => ({data: [queryResult], total: 1}) )
                ),
              )
            ),
          )
        )
      )
    ).pipe(
      RxJS.tap( {
        error: (error) => this._logger.error(`findAllBalance failed, filterBy: ${filterBy} filter: ${filter} `, error),
      }),
      RxJS.catchError((_) => RxJS.throwError(() => new HttpException(
        {
          statusCode: '500',
          message: 'Something Went Wrong',
          error: 'Internal Server Error'
        }, HttpStatus.INTERNAL_SERVER_ERROR))
      )
    )
  }
}