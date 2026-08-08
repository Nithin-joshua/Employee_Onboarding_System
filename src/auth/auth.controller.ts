import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.pass);
  }

  @Public()
  @Post('register')
  async registerCandidate(
    @Body()
    body: RegisterDto,
  ) {
    return this.authService.registerCandidate(body);
  }

  @Public()
  @Post('verify-otp')
  async verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtp(body.email, body.otp);
  }

  @Public()
  @Post('resend-otp')
  async resendOtp(@Body() body: ResendOtpDto) {
    return this.authService.resendOtp(body.email);
  }
}
