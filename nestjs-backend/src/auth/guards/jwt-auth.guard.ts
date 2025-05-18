import { ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    this.logger.debug(`Validating JWT: ${authHeader ? 'Token present' : 'No token'}`);
    
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    this.logger.debug(`JWT validation result - Error: ${err ? 'Yes' : 'No'}, User: ${user ? 'Yes' : 'No'}`);
    if (err || !user) {
      this.logger.error(`JWT validation failed: ${err?.message || info?.message || 'No user found'}`);
      throw err || new UnauthorizedException('Authentication required');
    }
    
    this.logger.debug(`Authenticated user: ${JSON.stringify({ id: user.userId, role: user.role })}`);
    return user;
  }
} 