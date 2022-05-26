import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl, FormGroup } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { OrderStatus } from 'src/app/models/order-status.enum';
import { EnumToStringPipe } from '../enum-to-string.pipe';
import { DatabaseService } from 'src/app/services/database.service';
import { LicenseType } from 'src/app/models/license-type.enum';

@Component({
  selector: 'app-data-dialog',
  templateUrl: './data-dialog.component.html',
  styleUrls: ['./data-dialog.component.css'],
})
export class DataDialogComponent {
  public form: FormGroup = new FormGroup({});
  LicenseType = LicenseType;
  OrderStatus = OrderStatus;
  distributionAreas: string[] = [];
  days: string[] = [
    'ראשון',
    'שני',
    'שלישי',
    'רביעי',
    'חמישי',
    'שישי',
    'שבת'
  ];

  constructor(
    private db: DatabaseService,
    private datePipe: DatePipe,
    private enumToStringPipe: EnumToStringPipe,
    private dialogRef: MatDialogRef<DataDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.db.getCitiesJSON().subscribe(data => {
      this.distributionAreas = Array.from(new Set(data.map((d: any) => d.lishka).sort().filter(Boolean)));
      this.distributionAreas.push('תל אביב - יפו');
    });
    
    if (data?.order) {      
      this.form = new FormGroup({
        uid: new FormControl({ value: this.data?.order?.uid, disabled: true }),
        name: new FormControl({ value: this.data?.order?.name, disabled: true}),
        phone: new FormControl({ value: this.data?.order?.phone, disabled: true}),
        deliveryDate: new FormControl({ value: this.datePipe.transform(this.data?.order?.deliveryDate, 'yyyy-MM-dd'), disabled: true}),
        orderWeight: new FormControl({ value: this.data?.order?.orderWeight, disabled: true}),
        deliveryCity: new FormControl({ value: this.data?.order?.deliveryCity, disabled: true}),
        deliveryAddress: new FormControl({ value: this.data?.order?.deliveryAddress, disabled: true}),
        deliveryAddressNumber: new FormControl({ value: this.data?.order?.deliveryAddressNumber, disabled: true}),
        orderStatus: new FormControl({ value: this.enumToStringPipe.transform(this.data?.order?.orderStatus, OrderStatus), disabled: true}),
        description: new FormControl({ value: this.data?.order?.description, disabled: true}),
      });
    }
    else if (data?.route) {
      this.form = new FormGroup({
        uid: new FormControl({ value: data.route.uid, disabled: true}),
        name: new FormControl({ value: data.route.name, disabled: true}),
        distributionAreas: new FormControl({ value: data.route.distributionAreas, disabled: true}),
        distributionDays: new FormControl({ value: data.route.distributionDays, disabled: true}),
        licenseType: new FormControl({ value: data.route.licenseType, disabled: true}),
        trackLength: new FormControl({ value: data.route.trackLength, disabled: true}),
        numPoint: new FormControl({ value: data.route.numPoint, disabled: true}),
      });
    }
    else if (data?.driver) {
      this.form = new FormGroup({
        uid: new FormControl({ value: data.driver.uid, disabled: true }),
        displayName: new FormControl({value: data.driver.displayName, disabled: true}),
        email: new FormControl({ value: data.driver.email, disabled: true}),
        phoneNumber: new FormControl({value: data.driver.phoneNumber, disabled: true}),
        city: new FormControl({value: data.driver.city, disabled: true}),
        address: new FormControl({value: data.driver.address, disabled: true}),
        addressNumber: new FormControl({value: data.driver.addressNumber, disabled: true}),
        licenseType: new FormControl({value: data.driver.licenseType, disabled: true}),
        workingStartDate: new FormControl({ value: data.driver.workingStartDate, disabled: true }),
        truck: new FormControl({ value: '', disabled: true }),
      });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
