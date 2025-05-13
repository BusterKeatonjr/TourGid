import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PlacesService } from './places.service';

@Injectable()
export class LlmService {
  private readonly apiKey: string;
  private readonly folderId: string;

  constructor(
    private configService: ConfigService,
    private placesService: PlacesService
  ) {
    this.apiKey = this.configService.get<string>('YANDEX_API_KEY');
    this.folderId = this.configService.get<string>('YANDEX_FOLDER_ID');
  }

  async askQuestion(question: string) {
    const contextItems = this.placesService.findPlacesByName(question);
    const context = contextItems.map(item => item.description).join('\n');
    
    // Получаем все названия мест
    const allPlaceNames = this.placesService.getPlaceNames();
    
    const url = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";
    const headers = {
      "Authorization": `Api-Key ${this.apiKey}`,
      "Content-Type": "application/json"
    };
    
    const systemPrompt = `
    Ты эксперт-гид по Крыму. Используй ТОЛЬКО названия из следующего списка:
    
    ${allPlaceNames.join(', ')}
    
    Формат ответа:

    **Описание маршрута**
    Краткое описание маршрута с историческими справками.

    **Маршрут:**
    1. {точное название из списка}
    2. {точное название из списка}
    3. {точное название из списка}

    **Рекомендации**
    Советы по посещению.
    
    **Описание Мест**
    Можешь предоставлять интересную информацию про места

    ВАЖНО: Используй только названия из предоставленного списка. Не изменяй названия.
    Не добавляй объекты, которых нет в списке.
    `;
    
    const data = {
      modelUri: `gpt://${this.folderId}/yandexgpt/latest`,
      completionOptions: {
        temperature: 0.3,
        maxTokens: "1000"
      },
      messages: [
        {
          role: "system",
          text: systemPrompt
        },
        {
          role: "user",
          text: question + "\n\nКонтекст: " + context
        }
      ]
    };
    
    try {
      const response = await axios.post(url, data, { headers });
      
      return {
        answer: response.data.result.alternatives[0].message.text,
        contextItems
      };
    } catch (error) {
      console.error('Ошибка запроса к YandexGPT:', error.response?.data || error.message);
      throw new Error('Ошибка при обработке запроса к LLM');
    }
  }

  async generateRoute(query: string) {
    try {
      const result = await this.askQuestion(query);
      
      // Извлечение точек маршрута из ответа
      const points = this.extractPointsFromAnswer(result.answer);
      console.log(`Извлеченные точки: ${points}`);
      
      // Поиск координат в базе данных
      const routePoints = this.placesService.findPlacesByCoords(points);
      console.log(`Финальные точки для маршрута: ${JSON.stringify(routePoints)}`);
      
      return {
        description: result.answer,
        points: routePoints
      };
    } catch (error) {
      console.error('Ошибка генерации маршрута:', error);
      throw new Error('Ошибка при генерации маршрута');
    }
  }

  private extractPointsFromAnswer(answer: string): string[] {
    const points = [];
    const lines = answer.split('\n');
    
    // Ищем список мест в ответе
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/Маршрут:|Список мест:|Точки маршрута:/i.test(line)) {
        // Извлекаем пронумерованный список
        let j = i + 1;
        while (j < lines.length && /^\d+\./.test(lines[j].trim())) {
          const match = lines[j].trim().match(/^\d+\.\s+(.*?)$/);
          if (match) {
            points.push(match[1].trim());
          }
          j++;
        }
        
        // Если не нашли пронумерованный список, ищем в текущей строке
        if (points.length === 0) {
          const parts = line.split(/Маршрут:|Список мест:|Точки маршрута:/i, 2);
          if (parts.length > 1) {
            for (const point of parts[1].split(/;|,/)) {
              const cleanPoint = point.trim();
              if (cleanPoint) {
                points.push(cleanPoint);
              }
            }
          }
        }
      }
    }
    
    return points;
  }
}
