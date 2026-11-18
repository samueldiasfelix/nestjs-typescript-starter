import { CurrentUser, Public, SignInService } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import type { User } from '../users/user.entity.js';
import {
  type SignIn,
  type SignUp,
  signInSchema,
  signUpSchema,
} from './auth.schemas.js';
import { CredentialsService } from './credentials.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly credentials: CredentialsService,
    private readonly signInService: SignInService,
  ) {}

  /** Creates the account and signs this browser in. */
  @Public()
  @Post('sign-up')
  async signUp(@Body({ schema: signUpSchema }) body: SignUp): Promise<User> {
    const user = await this.credentials.register(body.email, body.password);
    await this.signInService.signIn(user.id, { method: 'password' });
    return user;
  }

  @Public()
  @Post('sign-in')
  @HttpCode(200)
  async signIn(@Body({ schema: signInSchema }) body: SignIn): Promise<User> {
    const user = await this.credentials.verify(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    await this.signInService.signIn(user.id, { method: 'password' });
    return user;
  }

  /** Ends this browser's session. */
  @Public()
  @Post('sign-out')
  @HttpCode(204)
  async signOut() {
    if (!(await this.signInService.signOut())) {
      throw new UnauthorizedException();
    }
  }

  /** Ends every session of the user, on every device. */
  @Can.Anyone()
  @Post('sign-out-everywhere')
  @HttpCode(204)
  async signOutEverywhere(@CurrentUser('id') userId: string) {
    await this.signInService.signOutEverywhere(userId);
  }

  @Can.Anyone()
  @Get('me')
  me(@CurrentUser() user: User): User {
    return user;
  }
}
