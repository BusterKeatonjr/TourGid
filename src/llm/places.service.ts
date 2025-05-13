import { Injectable, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface Place {
  name: string;
  type: string;
  coords: [number, number];
  description: string;
}

@Injectable()
export class PlacesService implements OnModuleInit {
  private places: Place[] = [];

  async onModuleInit() {
    try {
      // Пытаемся загрузить данные из разных путей
      const data = this.loadPlacesData();
      this.places = data;
      console.log(`Загружено ${this.places.length} мест`);
    } catch (error) {
      console.error('Ошибка загрузки мест:', error);
      this.places = [];
    }
  }

  private loadPlacesData(): Place[] {
    try {
      const filePath = join(process.cwd(), 'data', 'crimea_places.json');
      const fileContent = readFileSync(filePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      try {
        // Альтернативный путь
        const filePath = join(process.cwd(), 'crimea_places.json');
        const fileContent = readFileSync(filePath, 'utf-8');
        return JSON.parse(fileContent);
      } catch (innerError) {
        console.error('Не удалось загрузить данные о местах:', innerError);
        return [];
      }
    }
  }

  getAllPlaces(): Place[] {
    return this.places;
  }

  findPlacesByName(query: string): Place[] {
    const queryLower = query.toLowerCase();
    return this.places.filter(place => 
      place.name.toLowerCase().includes(queryLower) ||
      place.description.toLowerCase().includes(queryLower)
    ).slice(0, 3);
  }

  getPlaceNames(): string[] {
    return this.places.map(place => place.name);
  }

  findPlacesByCoords(points: string[]): any[] {
    const result = [];
    
    for (const point of points) {
      // Очистка названия
      const cleanPoint = point.toLowerCase().replace(/[^a-zA-Zа-яА-Я0-9\s]/g, '').trim();
      
      // Поиск в базе данных
      let found = false;
      for (const place of this.places) {
        const placeName = place.name.toLowerCase().replace(/[^a-zA-Zа-яА-Я0-9\s]/g, '').trim();
        if (cleanPoint.includes(placeName) || placeName.includes(cleanPoint)) {
          result.push({
            name: place.name,
            coords: place.coords,
            type: place.type
          });
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.log(`Точка '${point}' не найдена в базе`);
      }
    }
    
    return result;
  }
}
