import { Controller, Get, Post, Put, Body, UseGuards, Request, Param, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { UsersService } from '../users/users.service';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';
import { AddTripDto } from '../users/dto/add-trip.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';

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
      storage: diskStorage({
        destination: './uploads/profile-photos',
        filename: (req, file, cb) => {
          const userId = req.user.sub;
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${userId}-${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadPhoto(@Request() req, @UploadedFile() file) {
    const photoUrl = `profile-photos/${file.filename}`;
    return this.usersService.updateProfile(req.user.sub, { photo: photoUrl });
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
