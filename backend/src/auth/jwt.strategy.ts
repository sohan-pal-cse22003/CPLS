import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { User } from '../entities/user.entity';
import { TokenList } from '../entities/token-list.entity';

interface JwtPayload {
  sub: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(TokenList)
    private tokenListRepository: Repository<TokenList>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'CPLS_JWT_SECRET_KEY_2026',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<User> {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const tokenExists = await this.tokenListRepository.findOne({
          where: { token },
        });
        if (!tokenExists) {
          throw new UnauthorizedException(
            'Session expired. Please log in again.',
          );
        }
      }
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: { listings: true },
    });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    if (user.isBlocked) {
      throw new UnauthorizedException(
        'Your account has been blocked by the administrator.',
      );
    }
    return user;
  }
}
