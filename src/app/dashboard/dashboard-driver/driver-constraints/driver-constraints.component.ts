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

@Component({
  selector: 'app-driver-constraints',
  templateUrl: './driver-constraints.component.html',
  styleUrls: ['./driver-constraints.component.scss']
})
export class DriverConstraintsComponent implements OnInit {
  pickedArr: Date[] = [];
  minDate: Date | undefined;
  isLoading: boolean = false;
  driver: Driver | undefined;
  constraints: DriverConstraint[] = [];
  loggedInUserId: any;

  range = new FormGroup({
    start: new FormControl(),
    end: new FormControl(),
  });

  dateFilter = (date: any) => {
    if (date == null) {
      return false;
    }

    if (this.constraints?.length > 0) {
      return this.pickedArr?.findIndex(p => new Date(p)?.getTime() == new Date(date).getTime()) == -1 && this.constraints.findIndex(s => new Date(s.date).getTime() == new Date(date)?.getTime()) == -1
    }

    return this.pickedArr?.findIndex(p => new Date(p)?.getTime() == new Date(date).getTime()) == -1;
  };

  constructor(
    public router: Router,
    public db: DatabaseService,
    public afAuth: AngularFireAuth,
    private alertService: AlertService,
    private sessionStorageService: SessionStorageService,
    public globals: Globals
  ) { }

  private getDriver() {
    const drivers = JSON.parse(this.sessionStorageService.getItem('drivers'));
    const driverConstraints = JSON.parse(this.sessionStorageService.getItem('driver-constraints'));

    this.driver = drivers.find((a: any) => a.uid == this.loggedInUserId);
    if (this.driver) {
      this.constraints = driverConstraints?.filter((a: any) => a.driver == this.loggedInUserId || a.driver.uid == this.loggedInUserId).map((constraint: DriverConstraint) => {
        constraint.driver = this.driver;
        constraint.date = new Date(constraint.date);
        constraint.id = constraint.id;
        return constraint;
      });

      this.pickedArr = this.constraints?.map(c => new Date(c.date));
    }
  }

  get sortData() {
    return this.pickedArr?.sort((a, b) => {
      return <any>(a) - <any>(b);
    });
  }

  valueChanged(value: any) {
    this.pickedArr?.push(value);
  }

  deleteDate(date: Date) {
    if (!this.isLoading) {
      this.pickedArr = this.pickedArr?.filter(p => new Date(p)?.getTime() != new Date(date)?.getTime());
    }
  }

  submit() {
    let pickedArrTimes = this.pickedArr.map(p => new Date(p).getTime());
    let constraintsTimes = this.constraints.map(c => new Date(c.date).getTime());

    // everything was deleted remove all
    if (!this.pickedArr.length && !!this.constraints.length) {
      this.isLoading = true;
      for (let i = 0; i < this.constraints?.length; i++) {
        this.db.removeDriverConstraint(this.constraints[i].id).then(() => {
          this.pickedArr = [];
          this.constraints = [];
          this.isLoading = false;
        });
      }
    }

    for (let i = 0; i < pickedArrTimes?.length; i++) {
      if (constraintsTimes.includes(pickedArrTimes[i])) {
        continue;
      }
      // new record
      else if (!constraintsTimes.includes(pickedArrTimes[i])) {
        this.isLoading = true;
        this.db.putDriverConstraint(this.driver?.uid, new Date(pickedArrTimes[i])).then(id => {
          constraintsTimes.push(pickedArrTimes[i]);
          this.constraints.push({ date: this.pickedArr[i], driver: this.driver, id } as DriverConstraint);
          this.isLoading = false;
        });
      }
    }

    for (let i = 0; i < constraintsTimes?.length; i++) {
      if (pickedArrTimes.includes(constraintsTimes[i])) {
        continue;
      }
      else {
        this.isLoading = true;
        const constraint = this.constraints.find(c => new Date(c.date).getTime() === constraintsTimes[i]);
        this.db.removeDriverConstraint(constraint?.id).then(() => {
          constraintsTimes = constraintsTimes.filter(c => c !== constraintsTimes[i]);
          this.constraints = this.constraints.filter(c => new Date(c.date).getTime() !== constraintsTimes[i]);
          this.isLoading = false;
        });
      }
    }

    this.alertService.ok(`תודה רבה!`, `עדכנו את התאריכים במערכת בהצלחה`);
  }

  ngOnInit(): void {
    this.minDate = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    if (sessionStorage.getItem('user') != null) {
      let temp = sessionStorage.getItem('user');
      if (temp != null) {
        let user = JSON.parse(temp);
        this.loggedInUserId = user?.uid;
        this.getDriver();
      }
    } else {
      this.afAuth.authState.subscribe((auth) => {
        this.loggedInUserId = auth?.uid;
        this.getDriver();
      });
    }
  }
}