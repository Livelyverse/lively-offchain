import { BaseEntity } from './base.entity';
import { Column, Entity, } from 'typeorm';

@Entity({ name: 'role' })
export class RoleEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 128, unique: true, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 512, unique: false, nullable: true })
  description: string;
}
