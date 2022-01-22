import { Component, Inject } from '@angular/core';
import { MatSnackBarRef, MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';

/**
 * Snackbar component for generic HTTP error messages.
 */
@Component({
  selector: 'http-error-snack',
  styleUrls: ['./alert.component.css'],
  templateUrl: './http-error-snack.component.html'
})
export class HttpErrorSnackComponent {
  /**
   * Creates a new snackbar.
   *
   * @param snackBarRef parent snackbar reference (injected)
   * @param data data payload (injected)
   */
  constructor(
    public snackBarRef: MatSnackBarRef<HttpErrorSnackComponent>,
    @Inject(MAT_SNACK_BAR_DATA) public data: any
  ) { }

  /**
   * Dismisses the snackbar.
   */
  dismiss() {
    this.snackBarRef.dismiss();
  }
}
