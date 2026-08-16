import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { DbModule } from '../db/db.module';

function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is required. ' +
        'Set it in your .env file (see .env.example).',
    );
  }
  return secret;
}

@Module({
  imports: [
    DbModule,
    PassportModule,
    JwtModule.register({
      secret: requireJwtSecret(),
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
