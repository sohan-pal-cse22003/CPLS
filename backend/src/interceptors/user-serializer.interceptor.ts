import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from '../entities/user.entity';

@Injectable()
export class UserSerializerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        return this.serialize(data);
      }),
    );
  }

  private serialize(data: any): any {
    if (!data) return data;

    // Check if it's an array of items
    if (Array.isArray(data)) {
      return data.map((item) => this.serialize(item));
    }

    // Check if it's a User entity or looks like a user object
    if (
      data instanceof User ||
      (typeof data === 'object' &&
        'email' in data &&
        'name' in data &&
        'role' in data)
    ) {
      return this.formatUser(data);
    }

    // Check if user is nested inside an envelope (e.g. login response)
    if (typeof data === 'object') {
      const result = { ...data };
      for (const key of Object.keys(result)) {
        result[key] = this.serialize(result[key]);
      }
      return result;
    }

    return data;
  }

  private formatUser(user: any): any {
    const formatted: any = { ...user };

    // Remove password field
    delete formatted.password;

    // Map listings relation to services array expected by the frontend
    if (user.listings) {
      formatted.services = user.listings.map((l: any) => ({
        id: l.subcat_id,
        price: Number(l.price),
      }));
    } else if (!formatted.services) {
      formatted.services = [];
    }

    // Ensure ratings are numbers
    formatted.rating = Number(user.rating || 0);

    return formatted;
  }
}
