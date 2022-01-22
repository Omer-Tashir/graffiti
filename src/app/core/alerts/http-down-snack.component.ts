import { Component, Inject } from '@angular/core';
import { MatSnackBarRef, MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';

/**
 * Snackbar component for HTTP unavailable error message.
 */
@Component({
  selector: 'down-error-snack',
  styleUrls: ['./alert.component.css'],
  templateUrl: './http-down-snack.component.html'
})
export class HttpDownSnackComponent {
  /**
   * Creates a new snackbar.
   *
   * @param snackBarRef parent snackbar reference (injected)
   * @param data data payload (injected)
   */
  constructor(
    public snackBarRef: MatSnackBarRef<HttpDownSnackComponent>,
    @Inject(MAT_SNACK_BAR_DATA) public data: any
  ) { }

  /**
   * Dismisses the snackbar.
   */
  dismiss() {
    this.snackBarRef.dismiss();
  }
}
