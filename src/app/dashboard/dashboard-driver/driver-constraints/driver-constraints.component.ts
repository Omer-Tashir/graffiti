import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Driver } from 'src/app/models/driver.interface';
import { DriverConstraint } from 'src/app/models/driver-constraint';
import { DatabaseService } from 'src/app/services/database.service';
import { AlertService } from 'src/app/core/alerts/alert.service';
import { Globals } from 'src/app/app.globals';
import { SessionStorageService } from 'src/app/core/session-storage-service';
import { FormControl, FormGroup } from '@angular/forms';

import * as moment from "moment/moment";
import { KeyValue, Location } from '@angular/common';

@Component({
  selector: 'app-driver-constraints',
  templateUrl: './driver-constraints.component.html',
  styleUrls: ['./driver-constraints.component.scss']
})
export class DriverConstraintsComponent implements OnInit {
  pickedArr: Map<Date, string> = new Map<Date, string>();
  minDate: Date | undefined;
  isLoading: boolean = false;
  driver: Driver | undefined;
  drivers: Driver[] = [];
  driverId: FormControl = new FormControl();
  description: FormControl = new FormControl();
  constraints: DriverConstraint[] = [];
  loggedInUserId: any;
  distManager: any;
  tempDate: any;

  range = new FormGroup({
    start: new FormControl(),
    end: new FormControl(),
  });

  dateFilter = (date: any) => {
    if (date == null) {
      return false;
    }

    if (this.constraints?.length > 0) {
      return Array.from(this.pickedArr.keys())?.findIndex(p => moment(p).toDate().getTime() == moment(date).toDate().getTime()) == -1 && this.constraints.findIndex(s => moment(s.date).toDate().getTime() == moment(date).toDate().getTime()) == -1
    }

    return Array.from(this.pickedArr.keys())?.findIndex(p => moment(p).toDate().getTime() == moment(date).toDate().getTime()) == -1;
  };

  keyDescOrder = (a: KeyValue<Date,string>, b: KeyValue<Date,string>): number => {
    return a.key > b.key ? -1 : (b.key > a.key ? 1 : 0);
  }

  constructor(
    public location: Location,
    public router: Router,
    public db: DatabaseService,
    public afAuth: AngularFireAuth,
    private alertService: AlertService,
    private sessionStorageService: SessionStorageService,
    public globals: Globals
  ) { }

  private getDriver(driverUid?: string) {
    const driverConstraints = JSON.parse(this.sessionStorageService.getItem('driver-constraints'));
    this.driver = this.drivers.find((a: any) => a.uid == (driverUid ?? this.loggedInUserId));

    if (this.driver) {
      this.constraints = driverConstraints?.filter((a: any) => a.driver == (driverUid ?? this.loggedInUserId) || a.driver.uid == (driverUid ?? this.loggedInUserId)).map((constraint: DriverConstraint) => {
        constraint.driver = this.driver;
        constraint.date = moment(constraint.date).toDate();
        constraint.id = constraint.id;
        constraint.comment = constraint.comment;
        return constraint;
      });

      this.pickedArr = this.constraints.reduce(function (map, obj) {
        map.set(obj.date, obj.comment);
        return map;
      }, new Map<Date, string>());
    }
  }

  add(): void {
    this.pickedArr.set(this.tempDate, this.description.value);
    this.description.reset();
    this.tempDate = undefined;
  }

  valueChanged(value: any) {
    this.tempDate = moment(value).toDate();
  }

  deleteDate(date: Date) {
    if (!this.isLoading) {
      this.pickedArr.delete(date);
    }
  }

  submit() {
    // everything was deleted remove all
    if (!this.pickedArr.size && !!this.constraints.length) {
      this.isLoading = true;
      for (let i = 0; i < this.constraints?.length; i++) {
        this.db.removeDriverConstraint(this.constraints[i].id).then(() => {
          this.pickedArr = new Map<Date, string>();
          this.constraints = [];
          this.isLoading = false;
        });
      }
    }

    for (let key of this.pickedArr.keys()) {
      if (this.constraints.map(c=>c.date).includes(key)) {
        continue;
      }
      // new record
      else if (!this.constraints.map(c => c.date).includes(key)) {
        this.isLoading = true;
        this.db.putDriverConstraint(this.driver?.uid, moment(key).toDate(), this.pickedArr.get(key)).then(id => {
          this.constraints.push({ date: key, driver: this.driver, id } as DriverConstraint);
          this.isLoading = false;
        });
      }
    }

    for (let i = 0; i < this.constraints.length; i++) {
      if (this.pickedArr.has(this.constraints[i].date)) {
        continue;
      }
      else {
        this.isLoading = true;
        const constraint = this.constraints.find(c => moment(c.date).toDate().getTime() === moment(this.constraints[i].date).toDate().getTime());
        this.db.removeDriverConstraint(constraint?.id).then(() => {
          this.constraints = this.constraints.filter(c => moment(c.date).toDate().getTime() !== moment(this.constraints[i].date).toDate().getTime());
          this.isLoading = false;
        });
      }
    }

    this.alertService.ok(`תודה רבה!`, `עדכנו את התאריכים במערכת בהצלחה`);
  }

  ngOnInit(): void {
    this.minDate = moment().add(2, 'day').toDate();
    this.distManager = sessionStorage.getItem('dist-manager');
    this.drivers = JSON.parse(this.sessionStorageService.getItem('drivers'))
      .sort((d1: Driver, d2: Driver) => d1.displayName.localeCompare(d2.displayName));

    if (sessionStorage.getItem('user') != null) {
      let temp = sessionStorage.getItem('user');
      if (temp != null) {
        let user = JSON.parse(temp);
        this.loggedInUserId = user?.uid;
        if (!this.distManager) {
          this.getDriver();
        }
      }
    } else {
      this.afAuth.authState.subscribe((auth) => {
        this.loggedInUserId = auth?.uid;
        if (!this.distManager) {
          this.getDriver();
        }
      });
    }

    if (!!this.distManager) {
      this.driverId.valueChanges.subscribe(driver => this.getDriver(driver));
    }
  }
}