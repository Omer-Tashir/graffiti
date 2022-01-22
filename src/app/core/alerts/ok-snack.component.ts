import { Component, Inject } from '@angular/core';
import { MatSnackBarRef, MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';

/**
 * Snackbar component for a completion confirmation.
 */
@Component({
  selector: 'ok-snack',
  styleUrls: ['./alert.component.css'],
  templateUrl: './ok-snack.component.html'
})
export class OkSnackComponent {
  /**
   * Creates a new snackbar.
   *
   * @param snackBarRef parent snackbar reference (injected)
   * @param data data payload (injected)
   */
  constructor(
    public snackBarRef: MatSnackBarRef<OkSnackComponent>,
    @Inject(MAT_SNACK_BAR_DATA) public data: any
  ) { }

  /**
   * Dismisses the snackbar.
   */
  dismiss() {
    this.snackBarRef.dismiss();
  }
}
