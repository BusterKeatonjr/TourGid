import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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
    
    // Добавляем поездку
    if (!user.myTrips) {
      user.myTrips = [];
    }
    
    user.myTrips.push(tripData);
    await this.userRepository.save(user);
    
    // Не возвращаем пароль
    const { password, ...result } = user;
    return result as User;
  }
}
