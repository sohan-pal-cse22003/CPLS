import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface BookingEvent {
  type: 'created' | 'status_updated' | 'rated';
  booking: any;
}

@Injectable()
export class BookingEventsService {
  private events$ = new Subject<BookingEvent>();

  emit(event: BookingEvent): void {
    this.events$.next(event);
  }

  getStream(): Observable<BookingEvent> {
    return this.events$.asObservable();
  }
}
