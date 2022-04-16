import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { Globals } from 'src/app/app.globals';
import { AlertService } from 'src/app/core/alerts/alert.service';
import { SessionStorageService } from 'src/app/core/session-storage-service';
import { DriverConstraint } from 'src/app/models/driver-constraint';
import { Driver } from 'src/app/models/driver.interface';
import { LicenseType } from 'src/app/models/license-type.enum';
import { DatabaseService } from 'src/app/services/database.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  LicenseType = LicenseType;
  form: FormGroup = new FormGroup({});
  isLoading: boolean = false;
  random: Number | undefined;
  minDate: Date | undefined;
  loggedInUserId: any;
  driver!: Driver;
  email: any;

  pickedArr: Date[] = [];
  constraints: DriverConstraint[] = [];

  range = new FormGroup({
    start: new FormControl(),
    end: new FormControl(),
  });

  selectedCity: any;
  selectedStreet: any;
  cities: any[] = [];
  allStreets: any[] = [];
  streets: any[] = [];
  filteredCities!: Observable<any[]>;
  filteredStreets!: Observable<any[]>;
  lishka: any;
  city: any;

  constructor(
    public router: Router,
    public db: DatabaseService,
    public afAuth: AngularFireAuth,
    private alertService: AlertService,
    private sessionStorageService: SessionStorageService,
    public globals: Globals,
    public location: Location,
  ) {}

  hasError = (controlName: string, errorName: string) => {
    return this.form?.controls[controlName].hasError(errorName);
  };

  submit = (formValue: any) => {
    if (this.form?.valid) {
      this.isLoading = true;
      this.updateDriver(formValue);
    }
  };

  updateDriver = (formValue: any) => {
    let driver: Driver = { ...formValue } as Driver;
    driver.uid = this.loggedInUserId;

    this.db
      .updateDriver(driver)
      .then(() => {
        this.alertService.ok(
          'תודה רבה',
          'פרטייך עודכנו בהצלחה'
        );
      })
      .catch((error) => {
        console.log(error);
        this.alertService.httpError(error);
      })
      .finally(() => {
        this.isLoading = false;
      });
  };

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
      this.initForm(this.driver);
    }
  }

  private initForm(driver: Driver): void {
    this.form = new FormGroup({
      uid: new FormControl({ value: driver.uid, disabled: true }, [Validators.required]),
      displayName: new FormControl(driver.displayName, [Validators.required]),
      email: new FormControl(driver.email, [Validators.email, Validators.required]),
      phoneNumber: new FormControl(driver.phoneNumber, [Validators.required]),
      city: new FormControl(driver.city, [Validators.nullValidator]),
      address: new FormControl(driver.address, [Validators.nullValidator]),
      addressNumber: new FormControl(driver.addressNumber, [Validators.nullValidator]),
      licenseType: new FormControl(driver.licenseType, [Validators.nullValidator]),
      workingStartDate: new FormControl(driver.workingStartDate, [Validators.nullValidator]),
      truck: new FormControl({ value: '', disabled: true }),
    });

    this.db.getCitiesJSON().subscribe(data => {
      this.cities = data;
    });

    this.db.getStreetsJSON().subscribe(data => {
      this.allStreets = data;
    });

    this.filteredCities = this.form.controls['city'].valueChanges.pipe(startWith(''), map(value => this._filterCities(value)));
    this.filteredStreets = this.form.controls['address'].valueChanges.pipe(startWith(''), map(value => this._filterStreets(value)));

    this.form.controls['city'].valueChanges.subscribe(
      (selectedValue) => {
        if (selectedValue != undefined && selectedValue.length > 0) {
          this.city = this.cities.filter(city => city['name'].toLowerCase() == selectedValue)[0];
          if (this.city != undefined) {
            this.lishka = this.city['lishka'];
            this.streets = this.allStreets.filter(street => street['שם_ישוב'] == this.city['name']);
          }
          else {
            this.lishka = "-";
          }
        }
      }
    );
  }

  cityClick(event: any) {
    this.selectedCity = event.option.value;
  }

  checkCity() {
    if (this.selectedCity && this.selectedCity == this.form.controls['city'].value) {
      this.form.controls['city'].setErrors(null);
      this.form.controls['city'].setValue(this.selectedCity.trim());
    }
    else {
      this.form.controls['city'].setErrors({ 'incorrect': true });
    }
  }

  streetClick(event: any) {
    this.selectedStreet = event.option.value;
  }

  checkStreet() {
    if (this.selectedStreet && this.selectedStreet == this.form.controls['address'].value) {
      this.form.controls['address'].setErrors(null);
      this.form.controls['address'].setValue(this.selectedStreet.trim());
    }
    else {
      this.form.controls['address'].setErrors({ 'incorrect': true });
    }
  }

  private _filterCities(value: string): string[] {
    const filterValue = value;
    let response = this.cities.filter(city => city['name'].includes(filterValue));
    return response;
  }

  private _filterStreets(value: string): string[] {
    const filterValue = value;
    let response = this.streets.filter(street => street['שם_רחוב'].includes(filterValue));
    return response
  }

  get sortData() {
    return this.pickedArr?.sort((a, b) => {
      return <any>(a) - <any>(b);
    });
  }

  dateFilter = (date: any) => {
    if (date == null) {
      return false;
    }

    if (this.constraints?.length > 0) {
      return this.pickedArr?.findIndex(p => new Date(p)?.getTime() == new Date(date).getTime()) == -1 && this.constraints.findIndex(s => new Date(s.date).getTime() == new Date(date)?.getTime()) == -1
    }

    return this.pickedArr?.findIndex(p => new Date(p)?.getTime() == new Date(date).getTime()) == -1;
  };

  valueChanged(value: any) {
    this.pickedArr?.push(value);
  }

  deleteDate(date: Date) {
    if (!this.isLoading) {
      this.pickedArr = this.pickedArr?.filter(p => new Date(p)?.getTime() != new Date(date)?.getTime());
    }
  }

  submitConstraints() {
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
    this.random = this.globals.random(1, 9);

    // Look for logged in user first
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
