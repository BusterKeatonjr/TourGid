import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Проверяем наличие DATABASE_URL (Railway предоставляет его)
        const databaseUrl = configService.get('DATABASE_URL');
        
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            synchronize: true, // В продакшене лучше отключить
            ssl: {
              rejectUnauthorized: false, // Для Railway
            },
          };
        }
        
        // Запасной вариант с отдельными параметрами
        return {
          type: 'postgres',
          host: configService.get('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get('DB_USERNAME', 'postgres'),
          password: configService.get('DB_PASSWORD', 'password'),
          database: configService.get('DB_DATABASE', 'nest_auth_db'),
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: configService.get<boolean>('DB_SYNC', true),
        };
      },
    }),
  ],
})
export class DatabaseModule {}
