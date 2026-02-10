import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class WikiHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  pageId: string;

  @Column()
  title: string;

  @CreateDateColumn()
  postedAt: Date;
}
