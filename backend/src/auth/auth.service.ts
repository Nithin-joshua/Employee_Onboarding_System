import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DbService } from '../db/db.service';
import { AuditLogService } from '../db/audit-log.service';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DbService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async registerCandidate(dto: {
    invitationCode: string;
    email: string;
    pass: string;
    name: string;
    dob: string;
    phone: string;
  }) {
    const existingUser = await this.db.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hash = await bcrypt.hash(dto.pass, 10);
    const employeeId = `OP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await this.db.$transaction(async (tx) => {
      // Validate code exists + not used and lock it
      const codeRecord = await tx.invitationCode.findUnique({
        where: { code: dto.invitationCode },
      });
      if (!codeRecord || codeRecord.used) {
        throw new ConflictException('Invalid or already used invitation code');
      }

      // Mark Invitation Code used early/atomically during registration
      await tx.invitationCode.update({
        where: { id: codeRecord.id },
        data: { used: true },
      });

      // Create User
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash: hash,
          role: 'NEW_HIRE',
          employeeId,
        },
      });

      // Create Employee record in REGISTERED state
      await tx.employee.create({
        data: {
          id: employeeId,
          status: 'REGISTERED',
          personal: {
            name: dto.name,
            dob: dto.dob,
            phone: dto.phone,
            email: dto.email,
          },
          job: {
            title: codeRecord.jobTitle,
            department: codeRecord.department,
            managerId: codeRecord.managerId,
            salary: codeRecord.salary,
            joiningDate: codeRecord.joiningDate.toISOString(),
          },
        },
      });

      await this.auditLogService.createLog(
        {
          employeeId: employeeId,
          fromStatus: 'REGISTERED',
          toStatus: 'REGISTERED',
          actorId: user.id,
          actorRole: 'NEW_HIRE',
          note: 'Candidate registered via invitation code',
        },
        tx,
      );

      await tx.otpCode.create({
        data: {
          userId: user.id,
          code: otp,
          expiresAt,
        },
      });
    });

    // Send via Brevo
    await this.emailService.sendOtp(dto.email, otp);

    return { email: dto.email, message: 'OTP sent to your email address' };
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user) {
      throw new ConflictException('User not found');
    }

    const latestOtp = await this.db.otpCode.findFirst({
      where: { userId: user.id },
      orderBy: { expiresAt: 'desc' },
    });

    if (
      !latestOtp ||
      latestOtp.code !== otp ||
      latestOtp.expiresAt < new Date()
    ) {
      throw new ConflictException('Invalid or expired OTP code');
    }

    await this.db.$transaction(async (tx) => {
      // Mark verified
      await tx.otpCode.update({
        where: { id: latestOtp.id },
        data: { verified: true },
      });

      // Fetch employee linked to user
      if (user.employeeId) {
        const employee = await tx.employee.findUnique({
          where: { id: user.employeeId },
        });

        if (employee && employee.status === 'REGISTERED') {
          // Transition status REGISTERED -> DOCUMENTS_PENDING
          await tx.employee.update({
            where: { id: user.employeeId },
            data: { status: 'DOCUMENTS_PENDING' },
          });

          await this.auditLogService.createLog(
            {
              employeeId: user.employeeId,
              fromStatus: 'REGISTERED',
              toStatus: 'DOCUMENTS_PENDING',
              actorId: user.id,
              actorRole: 'NEW_HIRE',
              note: 'OTP verified, candidate preboarding active',
            },
            tx,
          );
        }
      }
    });

    // Issue standard login token
    const payload = {
      sub: user.id,
      role: user.role,
      employeeId: user.employeeId,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async resendOtp(email: string) {
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user) {
      throw new ConflictException('User not found');
    }

    // Invalidate previous OTP codes by deleting or setting expiry to now
    await this.db.otpCode.deleteMany({
      where: { userId: user.id },
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await this.db.otpCode.create({
      data: {
        userId: user.id,
        code: otp,
        expiresAt,
      },
    });

    await this.emailService.sendOtp(email, otp);
    return { message: 'New OTP code sent to your email address' };
  }

  async login(email: string, pass: string) {
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = {
      sub: user.id,
      role: user.role,
      employeeId: user.employeeId,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async createSystemUser(dto: { email: string; pass: string; role: 'HR' | 'MANAGER'; employeeId?: string }) {
    const existingUser = await this.db.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hash = await bcrypt.hash(dto.pass, 10);
    const user = await this.db.user.create({
      data: {
        email: dto.email,
        passwordHash: hash,
        role: dto.role,
        employeeId: dto.employeeId || null,
      },
    });

    await this.auditLogService.createLog({
      employeeId: dto.employeeId || 'SYSTEM_USER',
      fromStatus: 'ACTIVE',
      toStatus: 'ACTIVE',
      actorId: 'ADMIN_PORTAL',
      actorRole: 'HR',
      note: `System user ${dto.role} created: ${dto.email}`,
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      createdAt: user.createdAt,
    };
  }

  async listSystemUsers() {
    return this.db.user.findMany({
      where: {
        role: {
          in: ['HR', 'MANAGER'],
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        employeeId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
