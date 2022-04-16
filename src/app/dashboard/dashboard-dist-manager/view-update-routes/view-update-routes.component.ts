import { DatePipe, Location } from '@angular/common';
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
import { EnumToStringPipe } from 'src/app/core/enum-to-string.pipe';
import { SessionStorageService } from 'src/app/core/session-storage-service';
import { WarningDialogComponent } from 'src/app/core/warning-dialog/warning-dialog.component';
import { LicenseType } from 'src/app/models/license-type.enum';
import { OrderStatus } from 'src/app/models/order-status.enum';
import { Route } from 'src/app/models/route.interface';
import { DatabaseService } from 'src/app/services/database.service';

@Component({
  selector: 'app-view-update-routes',
  templateUrl: './view-update-routes.component.html',
  styleUrls: ['./view-update-routes.component.scss']
})
export class ViewUpdateRoutesComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['name', 'distributionAreas', 'distributionDays', 'licenseType', 'actions'];
  dataSource!: MatTableDataSource<Route>;
  form: FormGroup = new FormGroup({});
  LicenseType = LicenseType;
  resultsLength = 0;
  isLoadingResults = true;
  isRateLimitReached = false;
  isLoading: boolean = false;
  random: Number | undefined;
  loggedInUserId: any;
  routes!: Route[];
  email: any;
  sort: any;
  paginator: any;
  isNewRecord = true;

  @ViewChild(MatSort) set matSort(ms: MatSort) {
    this.sort = ms;
  }

  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    this.paginator = mp;
  }

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
    public router: Router,
    public db: DatabaseService,
    public afAuth: AngularFireAuth,
    private alertService: AlertService,
    private sessionStorageService: SessionStorageService,
    private enumToStringPipe: EnumToStringPipe,
    private dialog: MatDialog,
    private datePipe: DatePipe,
    public globals: Globals,
    public location: Location,
  ) {}

  hasError = (controlName: string, errorName: string) => {
    return this.form?.controls[controlName].dirty && this.form?.controls[controlName].hasError(errorName);
  };

  reset(): void {
    this.routes = JSON.parse(this.sessionStorageService.getItem('routes'));
    this.isNewRecord = true;
    this.form.reset();
    this.initForm({} as Route);
  }

  submit = (formValue: any) => {
    if (this.form?.valid) {
      this.isLoading = true;
      this.putRoute(formValue);
    }
  };

  edit(route: Route): void {
    this.isNewRecord = false;
    this.initForm(route);
  }

  delete(route: Route): void {
    const dialogRef = this.dialog.open(WarningDialogComponent, {
      width: '600px',
      data: {
        title: 'האם את\\ה בטוח\\ה?',
        message: `המסלול יימחק מהמערכת`,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result != undefined && result != null) {
        this.db
          .removeRoute(route)
          .then(() => {
            this.afterRemoveRoute(route);
          })
          .catch((error) => {
            console.log(error);
            this.alertService.httpError(error);
          });
      }
    });
  }

  private afterRemoveRoute(route: Route) {
    this.alertService.ok(`הפעולה בוצעה בהצלחה`, `המסלול נמחק מהמערכת`);
    this.routes = this.routes.filter(o => o.uid !== route.uid);
    this.initDatasource(this.routes);
  }

  putRoute = (formValue: any) => {
    let route: Route = { ...formValue } as Route;
    route.uid = this.form.get('uid')?.value;

    this.db
      .putRoute(route, this.isNewRecord)
      .then(() => {
        this.routes = JSON.parse(this.sessionStorageService.getItem('routes'));
        this.initDatasource(this.routes);
        this.alertService.ok(
          'הפועלה בוצעה בהצלחה',
          'המסלול עודכן במערכת'
        );

        this.isNewRecord = true;
        this.form.reset();
        this.initForm({} as Route);
      })
      .catch((error) => {
        console.log(error);
        this.alertService.httpError(error);
      })
      .finally(() => {
        this.isLoading = false;
      });
  };

  private getRoutes() {
    this.routes = JSON.parse(this.sessionStorageService.getItem('routes'));
    this.initForm({} as Route);
  }

  private initDatasource(data: Route[]): void {
    this.dataSource = new MatTableDataSource(data);
    this.dataSource.filterPredicate = (route: Route, filter: string) => {
      return JSON.stringify(route).indexOf(filter) != -1
    };
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.sortData({ active: 'uid', direction: 'asc' });
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

    this.dataSource.data = data.sort((a: Route, b: Route) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'uid': return this.compare(a.uid, b.uid, isAsc);
        case 'name': return this.compare(a.name, b.name, isAsc);
        case 'distributionAreas': return this.compare(a.distributionAreas.toString(), b.distributionAreas.toString(), isAsc);
        case 'distributionDays': return this.compare(a.distributionDays.toString(), b.distributionDays.toString(), isAsc);
        case 'licenseType': return this.compare(a.licenseType, b.licenseType, isAsc);
        default: return 0;
      }
    });
  }

  private compare(a: number | string | boolean, b: number | string | boolean, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  track(index: any, route: Route) {
    return route?.uid;
  }

  private initForm(route: Route): void {
    this.form = new FormGroup({
      uid: new FormControl(route?.uid ?? this.globals.randomAlphaNumeric(20), [Validators.required]),
      name: new FormControl(route?.name, [Validators.required]),
      distributionAreas: new FormControl(route?.distributionAreas ?? [], [Validators.required]),
      distributionDays: new FormControl(route?.distributionDays ?? [], [Validators.required]),
      licenseType: new FormControl(route?.licenseType, [Validators.required]),
    });

    this.db.getCitiesJSON().subscribe(data => {
      this.distributionAreas = Array.from(new Set(data.map((d: any) => d.lishka).sort().filter(Boolean)));
    });
  }

  ngOnInit(): void {
    this.random = this.globals.random(1, 9);

    // Look for logged in user first
    if (sessionStorage.getItem('user') != null) {
      let temp = sessionStorage.getItem('user');
      if (temp != null) {
        let user = JSON.parse(temp);
        this.loggedInUserId = user?.uid;
        this.getRoutes();
      }
    } else {
      this.afAuth.authState.subscribe((auth) => {
        this.loggedInUserId = auth?.uid;
        this.getRoutes();
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
          return of(this.routes);
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
