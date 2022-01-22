import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-warning-dialog',
  templateUrl: './warning-dialog.component.html'
})
export class WarningDialogComponent {
  constructor(private dialogRef: MatDialogRef<WarningDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  cancel(): void {
    this.dialogRef.close();
  }
}
