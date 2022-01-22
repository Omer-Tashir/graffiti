import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

export class HttpService {
  protected constructor(private http: HttpClient) {}

  public get<T>(
    path: string = '',
    params?: { [param: string]: any }
  ): Observable<T> | any {
    return this.http.get<T>(path).pipe(catchError(this.catch));
  }

  public post<I, O>(data: I, path: string = ''): Observable<O> | any {
    return this.http.post<I>(path, data).pipe(catchError(this.catch));
  }

  public put<I, O>(data: I, path: string = ''): Observable<O> | any {
    return this.http.put<I>(path, data).pipe(catchError(this.catch));
  }

  public delete<T>(path: string = ''): Observable<T> | any {
    return this.http.delete<T>(path).pipe(catchError(this.catch));
  }

  public catch(err: HttpErrorResponse) {
    console.log(err);
    return of(undefined);
  }
}
