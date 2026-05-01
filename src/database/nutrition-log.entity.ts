import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('nutrition_logs')
export class NutritionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.nutritionLogs, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @Column({ nullable: true })
  foodName: string | null;

  @Column({ nullable: true })
  servingSize: string | null;

  @Column('simple-json', { nullable: true })
  nutrients: {
    calories: string;
    protein: string;
    fat: string;
    carbohydrates: string;
    saturatedFat: string;
    transFat: string;
    fiber: string;
    sugar: string;
    sodium: string;
  } | null;

  @Column({ nullable: true })
  description: string | null;

  @Column({ nullable: true })
  imageBase64: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
