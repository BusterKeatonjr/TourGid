import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { UsersModule } from '../users/users.module';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    UsersModule,
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [ProfileController],
})
export class ProfileModule {}
