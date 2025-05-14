import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  surname: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true, type: 'date' })
  birthday: Date;

  // Оставляем для обратной совместимости
  @Column({ nullable: true })
  photo: string;

  // Новые поля для хранения фотографии в БД
  @Column({ type: 'bytea', nullable: true })
  photoData: Buffer;

  @Column({ nullable: true })
  photoContentType: string;

  @Column({ nullable: true })
  photoFilename: string;

  @Column({ nullable: true })
  photoSize: number;

  @Column({ type: 'json', nullable: true })
  myTrips: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
