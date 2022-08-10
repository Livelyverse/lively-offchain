import { Column, Entity, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { UserEntity } from "./user.entity";

export enum SocialType {
  TWITTER = "TWITTER",
  INSTAGRAM = "INSTAGRAM",
  TIKTOK = "TIKTOK",
  TELEGRAM = "TELEGRAM",
  DISCORD = "DISCORD",
}

@Entity({ name: 'social_profile' })
export class SocialProfileEntity extends BaseEntity {

  @Column({ type: 'text', nullable: false})
  socialType: SocialType

  @Column({ type: 'varchar', length: 256, unique: false, nullable: true })
  socialName?: string

  @Column({ type: 'varchar', length: 256, unique: false, nullable: true })
  socialId?: string

  @Column({ type: 'varchar', length: 256, unique: false, nullable: false })
  username: string

  @Column({ type: 'varchar', length: 256, unique: false, nullable: true })
  profileName?: string

  @Column({ type: 'varchar', length: 1024, unique: false, nullable: true })
  profileUrl?: string

  @Column({ type: 'varchar', length: 1024, unique: false, nullable: true })
  website?: string

  @Column({ type: 'varchar', length: 256, unique: false, nullable: true })
  location?: string

  @ManyToOne((type) => UserEntity,{
    cascade: ['soft-remove'],
    onDelete: 'NO ACTION',
    nullable: false,
    lazy: false,
    eager: true,
    orphanedRowAction: 'nullify',
  })
  user: UserEntity
}