import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // 注册时只保存 bcrypt 哈希，不保存用户输入的明文密码。
  async register(data: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException('该邮箱已被注册');
    }

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: await hash(data.password, 12),
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return this.createAuthResponse(user);
  }

  async login(data: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user?.passwordHash || !(await compare(data.password, user.passwordHash))) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    return this.createAuthResponse({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  }

  private async createAuthResponse(user: {
    id: number;
    email: string;
    name: string | null;
  }) {
    return {
      accessToken: await this.jwtService.signAsync({
        sub: user.id,
      }),
      user,
    };
  }
}
