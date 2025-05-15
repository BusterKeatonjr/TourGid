import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findOneByUsername(username: string): Promise<User | undefined> {
    return this.userRepository.findOne({ where: { username } });
  }

  async findOneByEmail(email: string): Promise<User | undefined> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findOneById(id: number): Promise<User | undefined> {
    return this.userRepository.findOne({ where: { id } });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { username, email, password } = createUserDto;
    
    // Проверка на существующего пользователя
    const userByUsername = await this.findOneByUsername(username);
    if (userByUsername) {
      throw new HttpException('Пользователь с таким именем уже существует', HttpStatus.BAD_REQUEST);
    }
    
    const userByEmail = await this.findOneByEmail(email);
    if (userByEmail) {
      throw new HttpException('Email уже используется', HttpStatus.BAD_REQUEST);
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Создание пользователя
    const user = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
      myTrips: [],
    });
    
    await this.userRepository.save(user);
    
    // Не возвращаем пароль
    const { password: _, ...result } = user;
    return result as User;
  }

  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto): Promise<User> {
    const user = await this.findOneById(userId);
    
    if (!user) {
      throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
    }
    
    // Проверка email на уникальность, если он изменяется
    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const existingUser = await this.findOneByEmail(updateProfileDto.email);
      if (existingUser) {
        throw new HttpException('Email уже используется', HttpStatus.BAD_REQUEST);
      }
    }
    
    // Обновляем данные пользователя
    const updatedUser = this.userRepository.merge(user, updateProfileDto);
    await this.userRepository.save(updatedUser);
    
    // Не возвращаем пароль
    const { password, ...result } = updatedUser;
    return result as User;
  }

  async getProfile(userId: number): Promise<User> {
    const user = await this.findOneById(userId);
    
    if (!user) {
      throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
    }
    
    // Не возвращаем пароль
    const { password, ...result } = user;
    return result as User;
  }

  async addTrip(userId: number, tripData: any): Promise<User> {
    const user = await this.findOneById(userId);
    
    if (!user) {
      throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
    }
    
    // Инициализируем массив, если он еще не существует
    if (!user.myTrips) {
      user.myTrips = [];
    }
    
    // Добавляем поле number, равное длине массива + 1
    const tripWithNumber = {
      ...tripData,
      number: user.myTrips.length + 1
    };
    
    // Добавляем поездку
    user.myTrips.push(tripWithNumber);
    await this.userRepository.save(user);
    
    // Не возвращаем пароль
    const { password, ...result } = user;
    return result as User;
  }

  // Новые методы для работы с фотографиями в БД
  async savePhotoToDb(userId: number, photoData: {
    data: Buffer;
    contentType: string;
    filename: string;
    size: number;
  }): Promise<any> {
    const user = await this.findOneById(userId);
    
    if (!user) {
      throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
    }
    
    // Обновляем пользователя с данными фото
    user.photoData = photoData.data;
    user.photoContentType = photoData.contentType;
    user.photoFilename = photoData.filename;
    user.photoSize = photoData.size;
    
    await this.userRepository.save(user);
    
    // Возвращаем обновленного пользователя без бинарных данных для безопасности
    return {
      id: user.id,
      username: user.username,
      photoContentType: user.photoContentType,
      photoFilename: user.photoFilename,
      photoSize: user.photoSize,
      updatedAt: new Date()
    };
  }

  async getUserPhoto(userId: number): Promise<any> {
    const user = await this.findOneById(userId);
    
    if (!user) {
      throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
    }
    
    if (!user.photoData) {
      throw new HttpException('Фотография не найдена', HttpStatus.NOT_FOUND);
    }
    
    return {
      data: user.photoData.toString('base64'),
      contentType: user.photoContentType,
      filename: user.photoFilename
    };
  }
  async deleteTrip(userId: number, tripNumber: number): Promise<User> {
    console.log(`Deleting trip ${tripNumber} for user ${userId}`);
    
    const user = await this.findOneById(userId);
    
    if (!user) {
      throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
    }
    
    if (!user.myTrips || user.myTrips.length === 0) {
      throw new HttpException('Поездки не найдены', HttpStatus.NOT_FOUND);
    }
    
    console.log('Trips before deletion:', JSON.stringify(user.myTrips));
    
    // Используем преобразование к числу для корректного сравнения
    const tripIndex = user.myTrips.findIndex(trip => 
      (trip.number !== undefined && Number(trip.number) === Number(tripNumber)) || 
      (trip.number === undefined && Number(tripNumber) <= user.myTrips.length)
    );
    
    console.log(`Trip index found: ${tripIndex}`);
    
    if (tripIndex === -1) {
      // Если не смогли найти по номеру, попробуем удалить по индексу для обратной совместимости
      // Учитываем, что индексы начинаются с 0, а номера с 1
      if (tripNumber > 0 && tripNumber <= user.myTrips.length) {
        user.myTrips.splice(tripNumber - 1, 1);
        console.log(`Removed trip by index: ${tripNumber - 1}`);
      } else {
        console.log('Trip not found');
        throw new HttpException('Поездка с указанным номером не найдена', HttpStatus.NOT_FOUND);
      }
    } else {
      // Удаляем поездку по индексу
      user.myTrips.splice(tripIndex, 1);
      console.log(`Removed trip at index: ${tripIndex}`);
    }
    
    // Обновляем номера оставшихся поездок
    user.myTrips = user.myTrips.map((trip, index) => ({
      ...trip,
      number: index + 1
    }));
    
    await this.userRepository.save(user);
    console.log('User saved after trip deletion');
    
    // Не возвращаем пароль
    const { password, ...result } = user;
    return result as User;
  }
  
  // Улучшенный метод обновления номеров
  async updateTripNumbers(userId: number): Promise<void> {
    const user = await this.findOneById(userId);
    if (!user) return;
    
    if (user.myTrips && user.myTrips.length > 0) {
      // Создаем новый массив с присвоенными номерами
      user.myTrips = user.myTrips.map((trip, index) => ({
        ...trip,
        number: index + 1
      }));
      
      await this.userRepository.save(user);
      console.log('Trip numbers updated');
    }
  }
  async deleteTripByIndex(userId: number, index: number): Promise<User> {
  console.log(`Deleting trip at index ${index} for user ${userId}`);
  
  const user = await this.findOneById(userId);
  
  if (!user) {
    throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
  }
  
  if (!user.myTrips || user.myTrips.length === 0) {
    throw new HttpException('Поездки не найдены', HttpStatus.NOT_FOUND);
  }
  
  if (index < 0 || index >= user.myTrips.length) {
    throw new HttpException(`Поездка с индексом ${index} не найдена`, HttpStatus.NOT_FOUND);
  }
  
  console.log('Trips before deletion:', JSON.stringify(user.myTrips.map(t => t.destination)));
  
  // Удаляем поездку по индексу
  user.myTrips.splice(index, 1);
  console.log(`Removed trip at index: ${index}`);
  
  // Обновляем номера оставшихся поездок
  user.myTrips = user.myTrips.map((trip, idx) => ({
    ...trip,
    number: idx + 1
  }));
  
  await this.userRepository.save(user);
  console.log('User saved after trip deletion');
  
  // Не возвращаем пароль
  const { password, ...result } = user;
  return result as User;
}
}
