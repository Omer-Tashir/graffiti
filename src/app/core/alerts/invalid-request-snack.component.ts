import { Component, Inject } from '@angular/core';
import { MatSnackBarRef, MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';

/**
 * Snackbar component for invalid request messages containing a detailed error response.
 */
@Component({
  selector: 'invalid-request-snack',
  styleUrls: ['./alert.component.css'],
  templateUrl: './invalid-request-snack.component.html'
})
export class InvalidRequestSnackComponent {
  /**
   * Creates a new snackbar.
   *
   * @param snackBarRef parent snackbar reference (injected)
   * @param data data payload (injected)
   */
  constructor(
    public snackBarRef: MatSnackBarRef<InvalidRequestSnackComponent>,
    @Inject(MAT_SNACK_BAR_DATA) public data: any
  ) { }

  /**
   * Dismisses the snackbar.
   */
  dismiss() {
    this.snackBarRef.dismiss();
  }
}