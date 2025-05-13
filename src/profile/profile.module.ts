import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { UsersModule } from '../users/users.module';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    UsersModule,
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  controllers: [ProfileController],
})
export class ProfileModule {}
