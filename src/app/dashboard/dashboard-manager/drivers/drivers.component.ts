import { Location } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { merge, Observable, of } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';
import { Globals } from 'src/app/app.globals';
import { AlertService } from 'src/app/core/alerts/alert.service';
import { SessionStorageService } from 'src/app/core/session-storage-service';
import { WarningDialogComponent } from 'src/app/core/warning-dialog/warning-dialog.component';
import { DriverConstraint } from 'src/app/models/driver-constraint';
import { Driver } from 'src/app/models/driver.interface';
import { LicenseType } from 'src/app/models/license-type.enum';
import { DatabaseService } from 'src/app/services/database.service';

@Component({
  selector: 'app-drivers',
  templateUrl: './drivers.component.html',
  styleUrls: ['./drivers.component.scss']
})
export class DriversComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['displayName', 'email', 'phoneNumber', 'city', 'address', 'addressNumber', 'licenseType', 'workingStartDate', 'actions'];
  dataSource!: MatTableDataSource<Driver>;
  form: FormGroup = new FormGroup({});
  resultsLength = 0;
  isLoadingResults = true;
  isRateLimitReached = false;
  isLoading: boolean = false;
  random: Number | undefined;
  minDate: Date | undefined;
  loggedInUserId: any;
  drivers!: Driver[];
  email: any;
  sort: any;
  paginator: any;
  LicenseType = LicenseType;
  isNewRecord = true;

  @ViewChild(MatSort) set matSort(ms: MatSort) {
    this.sort = ms;
  }

  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    this.paginator = mp;
  }

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
    public location: Location,
    public router: Router,
    public db: DatabaseService,
    public afAuth: AngularFireAuth,
    private alertService: AlertService,
    private sessionStorageService: SessionStorageService,
    private dialog: MatDialog,
    public globals: Globals
  ) {}

  hasError = (controlName: string, errorName: string) => {
    return this.form?.controls[controlName].dirty && this.form?.controls[controlName].hasError(errorName);
  };

  reset(): void {
    this.drivers = JSON.parse(this.sessionStorageService.getItem('drivers'));
    this.isNewRecord = true;
    this.form.reset();
    this.initForm({} as Driver);
  }

  submit = (formValue: any) => {
    if (this.form?.valid) {
      this.isLoading = true;
      this.putDriver(formValue);
    }
  };

  edit(driver: Driver): void {
    this.isNewRecord = false;
    this.initForm(driver);
  }

  delete(driver: Driver): void {
    const dialogRef = this.dialog.open(WarningDialogComponent, {
      width: '600px',
      data: {
        title: 'האם את\\ה בטוח\\ה?',
        message: `הנהג יימחק מהמערכת`,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result != undefined && result != null) {
        this.db
          .removeDriver(driver)
          .then(() => {
            this.afterRemoveDriver(driver);
          })
          .catch((error) => {
            console.log(error);
            this.alertService.httpError(error);
          });
      }
    });
  }

  private afterRemoveDriver(driver: Driver) {
    this.alertService.ok(`הפעולה בוצעה בהצלחה`, `הנהג נמחק מהמערכת`);
    this.drivers = this.drivers.filter(o => o.uid !== driver.uid);
    this.initDatasource(this.drivers);
  }

  putDriver = (formValue: any) => {
    let driver: Driver = { ...formValue } as Driver;
    driver.uid = this.form.get('uid')?.value;

    this.db
      .putDriver(driver, this.isNewRecord)
      .then(() => {
        this.drivers = JSON.parse(this.sessionStorageService.getItem('drivers'));
        this.initDatasource(this.drivers);
        this.alertService.ok(
          'הפועלה בוצעה בהצלחה',
          'הנהג עודכן במערכת'
        );

        this.isNewRecord = true;
        this.form.reset();
        this.initForm({} as Driver);
      })
      .catch((error) => {
        console.log(error);
        this.alertService.httpError(error);
      })
      .finally(() => {
        this.isLoading = false;
      });
  };

  private getDrivers() {
    this.drivers = JSON.parse(this.sessionStorageService.getItem('drivers'));
    this.initForm({} as Driver);
  }

  private initDatasource(data: Driver[]): void {
    this.dataSource = new MatTableDataSource(data);
    this.dataSource.filterPredicate = (driver: Driver, filter: string) => {
      return JSON.stringify(driver).indexOf(filter) != -1
    };
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.sortData({ active: 'displayName', direction: 'asc' });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  sortData(sort: Sort) {
    const data = this.dataSource.data.slice();
    if (!sort.active || sort.direction === '') {
      this.dataSource.data = data;
      return;
    }

    this.dataSource.data = data.sort((a: Driver, b: Driver) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'uid': return this.compare(a.uid, b.uid, isAsc);
        case 'displayName': return this.compare(a.displayName, b.displayName, isAsc);
        case 'email': return this.compare(a.email, b.email, isAsc);
        case 'phoneNumber': return this.compare(a.phoneNumber, b.phoneNumber, isAsc);
        case 'city': return this.compare(a.city, b.city, isAsc);
        case 'address': return this.compare(a.address, b.address, isAsc);
        case 'addressNumber': return this.compare(a.addressNumber, b.addressNumber, isAsc);
        case 'licenseType': return this.compare(a.licenseType, b.licenseType, isAsc);
        case 'workingStartDate': return this.compare(a.workingStartDate.getTime(), b.workingStartDate.getTime(), isAsc);
        default: return 0;
      }
    });
  }

  private compare(a: number | string | boolean, b: number | string | boolean, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  track(index: any, driver: Driver) {
    return driver.uid;
  }

  private initForm(driver: Driver): void {
    this.form = new FormGroup({
      uid: new FormControl({ value: driver.uid ?? this.globals.randomAlphaNumeric(20), disabled: true }, [Validators.required]),
      displayName: new FormControl(driver.displayName, [Validators.required]),
      email: new FormControl(driver.email, [Validators.email, Validators.required]),
      phoneNumber: new FormControl(driver.phoneNumber, [Validators.required]),
      city: new FormControl(driver.city, [Validators.nullValidator]),
      address: new FormControl(driver.address, [Validators.nullValidator]),
      addressNumber: new FormControl(driver.addressNumber, [Validators.nullValidator]),
      licenseType: new FormControl(driver.licenseType, [Validators.nullValidator]),
      workingStartDate: new FormControl(driver.workingStartDate, [Validators.nullValidator]),
      truck: new FormControl({ value: '', disabled: true })
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

  ngOnInit(): void {
    this.random = this.globals.random(1, 9);

    // Look for logged in user first
    if (sessionStorage.getItem('user') != null) {
      let temp = sessionStorage.getItem('user');
      if (temp != null) {
        let user = JSON.parse(temp);
        this.loggedInUserId = user?.uid;
        this.getDrivers();
      }
    } else {
      this.afAuth.authState.subscribe((auth) => {
        this.loggedInUserId = auth?.uid;
        this.getDrivers();
      });
    }
  }

  ngAfterViewInit(): void {
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);

    merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        startWith({}),
        switchMap(() => {
          this.isLoadingResults = true;
          return of(this.drivers);
        }),
        map(data => {
          // Flip flag to show that loading has finished.
          this.isLoadingResults = false;
          this.isRateLimitReached = data === null;

          if (data === null) {
            return [];
          }

          this.resultsLength = data.length;
          return data;
        })
      ).subscribe(data => {
        this.initDatasource(data);
      });
  }
}