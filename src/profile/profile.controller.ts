import { Controller, Get, Post, Put, Delete, Body, UseGuards, Request, Param, UploadedFile, UseInterceptors, BadRequestException, ParseIntPipe,
  HttpException,
  HttpStatus } from '@nestjs/common';
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
  async getTrips(@Request() req) {
    await this.usersService.updateTripNumbers(req.user.sub);
    const user = await this.usersService.getProfile(req.user.sub);
    return user.myTrips?.map(trip => ({
      ...trip,
      // Гарантируем наличие номера
      number: trip.number || user.myTrips.indexOf(trip) + 1
    })) || [];
  }

  @Delete('trips/:number')
async deleteTrip(
  @Request() req, 
  @Param('number', ParseIntPipe) tripNumber: number
) {
  console.log(`DELETE request for trip ${tripNumber}, user: ${req.user.sub}`);
  try {
    const result = await this.usersService.deleteTrip(req.user.sub, tripNumber);
    console.log('Delete trip successful');
    return result;
  } catch (error) {
    console.error('Error deleting trip:', error.message);
    // Используем HttpException вместо BadRequestException для корректных кодов ошибок
    if (error instanceof HttpException) {
      throw error;
    }
    throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

}
