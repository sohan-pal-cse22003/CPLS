import type { User } from '../entities/user.entity';
declare global {
  namespace Express {
    interface Request {
      /**
       * Authenticated user attached by JwtStrategy
       */
      user?: User; // Authenticated user attached by JwtStrategy
    }
  }
}

export {}; // ensures this file is treated as a module
