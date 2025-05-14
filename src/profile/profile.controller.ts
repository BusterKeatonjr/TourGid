import { Controller, Get, Post, Put, Body, UseGuards, Request, Param, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { UsersService } from '../users/users.service';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';
import { AddTripDto } from '../users/dto/add-trip.dto';
import { memoryStorage } from 'multer';

@Controller('profile')
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getProfile(@Request() req) {
    return this.usersService.getProfile(req.user.sub);
  }

  @Put()
  updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.sub, updateProfileDto);
  }

  @Post('upload-photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(new BadRequestException('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadPhoto(@Request() req, @UploadedFile() file) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const userId = req.user.sub;
    
    // Подготавливаем данные фото для сохранения в БД
    const photoData = {
      data: file.buffer,
      contentType: file.mimetype,
      filename: file.originalname,
      size: file.size
    };

    return this.usersService.savePhotoToDb(userId, photoData);
  }

  @Get('photo')
  async getPhoto(@Request() req) {
    return this.usersService.getUserPhoto(req.user.sub);
  }

  @Post('trips')
  addTrip(@Request() req, @Body() addTripDto: AddTripDto) {
    return this.usersService.addTrip(req.user.sub, addTripDto);
  }

  @Get('trips')
  getTrips(@Request() req) {
    return this.usersService.getProfile(req.user.sub).then(user => user.myTrips || []);
  }
}
