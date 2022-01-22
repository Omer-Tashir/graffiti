import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { NavigationStart, Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';

import { BadRequestSnackComponent } from './bad-request-snack.component';
import { HttpDownSnackComponent } from './http-down-snack.component';
import { HttpErrorSnackComponent } from './http-error-snack.component';
import { OkSnackComponent } from './ok-snack.component';
import { InvalidRequestSnackComponent } from './invalid-request-snack.component';
import { ConflictSnackComponent } from './conflict-snack.component';
import { NotFoundSnackComponent } from './not-found-snack.component';

/**
 * Default configuration for the alert snackbar.
 */
const snackBarConfig: MatSnackBarConfig = {
  duration: 5000,
  horizontalPosition: 'left',
  verticalPosition: 'top',
};

/**
 * Alert service to display notification and error messages.
 */
@Injectable({
  providedIn: 'root',
})
export class AlertService {
  /**
   * Creates a new alert service.
   *
   * @param router system router (injected)
   * @param snackBar snackbar component (injected)
   */
  constructor(private router: Router, private snackBar: MatSnackBar) {
    router.events.subscribe((e) => {
      if (e instanceof NavigationStart) {
        this.snackBar.dismiss();
      }
    });
  }

  /**
   * Displays a completion notification.
   *
   * @param title notification title
   * @param message notification message
   */
  ok(title: string, message: string) {
    this.snackBar.openFromComponent(OkSnackComponent, {
      ...snackBarConfig,
      data: { title: title, message: message },
    });
  }

  /**
   * Handles the authentication error.
   *
   * If we receive a 401 from the REST API, it likely means our session is expired,
   * so the user will be routed to the login page.
   *
   * If we're already at the login page, then the error is caused by the user entering
   * the wrong credentials, so we'll just pop and error message.
   */
  authAlert() {
    if (this.router.url == '/login') {
      this.snackBar.openFromComponent(BadRequestSnackComponent, {
        ...snackBarConfig,
        duration: 5000,
        data: {
          message: 'שגיאת התחברות למערכת',
          messages: ['שם משתמש ואו הסיסמא אינם תקינים'],
        },
      });
    } else {
      this.router.navigate(['/login']);
    }
  }

  /**
   * Displays an error alert for a HTTP 400 "Bad Request" messages containing a detailed error response.
   *
   * @param error error messages
   */
  badRequestAlert(error: any) {
    this.snackBar.openFromComponent(BadRequestSnackComponent, {
      ...snackBarConfig,
      data: error,
    });
  }

  /**
   * Displays an error alert for invalid messages containing a detailed error response.
   *
   * @param error error messages
   */
  invalidRequestAlert(error: any) {
    this.snackBar.openFromComponent(InvalidRequestSnackComponent, {
      ...snackBarConfig,
      data: error,
    });
  }

  /**
   * Displays an error alert for conflict messages containing a detailed error response.
   *
   * @param error error messages
   */
  conflictAlert(error: any) {
    this.snackBar.openFromComponent(ConflictSnackComponent, {
      ...snackBarConfig,
      data: error,
    });
  }

  /**
   * Displays an error alert for not found messages containing a detailed error response.
   *
   * @param error error messages
   */
  notFoundAlert(error: any) {
    this.snackBar.openFromComponent(NotFoundSnackComponent, {
      ...snackBarConfig,
      data: error,
    });
  }

  /**
   * Displays an error alert for a HTTP connection failure.
   *
   * @param error error response
   */
  httpDownAlert(error: HttpErrorResponse) {
    this.snackBar.openFromComponent(HttpDownSnackComponent, {
      ...snackBarConfig,
      data: error,
    });
  }

  /**
   * Displays an error alert for a generic HTTP response.
   *
   * @param error error response
   */
  httpErrorAlert(error: HttpErrorResponse) {
    this.snackBar.openFromComponent(HttpErrorSnackComponent, {
      ...snackBarConfig,
      data: error,
    });
  }

  /**
   * Examines an HTTP error and displays a best fitting error alert.
   *
   * @param error HTTP error
   * @returns the same error entity
   */
  httpError(error: HttpErrorResponse | any): Observable<any> {
    if (error['code'] != undefined && error['code'].includes('auth')) {
      this.ok('שגיאת התחברות למערכת', 'שם המשתמש ואו הסיסמא אינם תקינים');
    } else {
      switch (error.status) {
        case 0:
          this.httpDownAlert(error);
          break;

        case 400:
        case 403:
          if (error.error.apierror != undefined) {
            this.badRequestAlert(error.error.apierror);
          } else {
            this.badRequestAlert(error.error);
          }
          break;

        case 401:
          this.authAlert();
          break;

        case 404:
          if (error.error.errors != undefined) {
            error.error.errors.forEach((err: any) => {
              this.invalidRequestAlert(err);
            });
          } else {
            this.notFoundAlert(error);
          }
          break;

        case 409:
          this.conflictAlert(error);
          break;

        case 500:
          if (error.error.errors != undefined) {
            error.error.errors.forEach((err: any) => {
              this.invalidRequestAlert(err);
            });
          } else {
            this.httpErrorAlert(error);
          }
          break;

        default:
          this.httpErrorAlert(error);
          break;
      }
    }

    return throwError(error);
  }
}
