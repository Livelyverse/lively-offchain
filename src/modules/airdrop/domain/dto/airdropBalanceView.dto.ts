import { ApiResponseProperty } from "@nestjs/swagger";

export interface AirdropBalance {
  total: bigint;
  pending: bigint;
  settlement: bigint;
  email?: string;
  userId?: string;
  actionType?: string;
  socialType?: string;
}

export class AirdropBalanceViewDto {
  static from(entity: AirdropBalance): AirdropBalanceViewDto | null {
    if(entity) {
      const balanceDto = new AirdropBalanceViewDto();
      balanceDto.total = entity.total.toString();
      balanceDto.pending = entity.pending.toString();
      balanceDto.settlement = entity.settlement.toString();
      balanceDto.email = entity?.email ? entity.email : null;
      balanceDto.userId = entity?.userId ? entity.userId : null;
      balanceDto.actionType = entity?.actionType ? entity.actionType : null;
      balanceDto.socialType = entity?.socialType ? entity.socialType : null;
      return balanceDto;
    }
    return null;
  }

  @ApiResponseProperty()
  total: string;

  @ApiResponseProperty()
  pending: string;

  @ApiResponseProperty()
  settlement: string;

  @ApiResponseProperty()
  email: string;

  @ApiResponseProperty()
  userId: string;

  @ApiResponseProperty()
  actionType: string;

  @ApiResponseProperty()
  socialType: string;
}