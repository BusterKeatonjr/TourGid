import { Controller, Get, Post, Body, UseGuards, Res, Param, NotFoundException } from '@nestjs/common';
import { LlmService } from './llm.service';
import { PlacesService } from './places.service';
import { AuthGuard } from '../auth/auth.guard';
import { join } from 'path';

@Controller('api')
export class LlmController {
  constructor(
    private readonly llmService: LlmService,
    private readonly placesService: PlacesService
  ) {}

  @Get('places')
  getAllPlaces() {
    const places = this.placesService.getAllPlaces().map(item => ({
      name: item.name,
      coords: item.coords,
      type: item.type,
      description: item.description
    }));
    return places;
  }

  @UseGuards(AuthGuard)
  @Post('ask')
  async askQuestion(@Body() body: { question: string }) {
    console.log(`Получен вопрос: ${body.question}`);
    return this.llmService.askQuestion(body.question);
  }

  @UseGuards(AuthGuard)
  @Post('generate_route')
  async generateRoute(@Body() body: { query: string }) {
    return this.llmService.generateRoute(body.query);
  }

  @Get('place/:id')
  getPlace(@Param('id') id: string) {
    const places = this.placesService.getAllPlaces();
    const placeId = parseInt(id, 10);
    
    if (isNaN(placeId) || placeId < 0 || placeId >= places.length) {
      throw new NotFoundException('Место не найдено');
    }
    
    return places[placeId];
  }

  
}
