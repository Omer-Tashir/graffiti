import { Component, Inject } from '@angular/core';
import { MatSnackBarRef, MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';

/**
 * Snackbar component for HTTP 400 "Bad Request" messages containing a detailed error response.
 */
@Component({
  selector: 'bad-request-snack',
  styleUrls: ['./alert.component.css'],
  templateUrl: './bad-request-snack.component.html'
})
export class BadRequestSnackComponent {
  /**
   * Creates a new snackbar.
   *
   * @param snackBarRef parent snackbar reference (injected)
   * @param data data payload (injected)
   */
  constructor(
    public snackBarRef: MatSnackBarRef<BadRequestSnackComponent>,
    @Inject(MAT_SNACK_BAR_DATA) public data: any
  ) { }

  /**
   * Dismisses the snackbar.
   */
  dismiss() {
    this.snackBarRef.dismiss();
  }
}
