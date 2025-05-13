import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';
import { PlacesService } from './places.service';

@Module({
  imports: [ConfigModule],
  controllers: [LlmController],
  providers: [LlmService, PlacesService],
  exports: [LlmService, PlacesService]
})
export class LlmModule {}
