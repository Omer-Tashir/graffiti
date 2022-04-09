import { DatePipe } from '@angular/common';
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
import { OrderStatus } from 'src/app/models/order-status.enum';
import { Order } from 'src/app/models/order.interface';
import { DatabaseService } from 'src/app/services/database.service';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['uid', 'deliveryCity', 'deliveryAddress', 'deliveryAddressNumber', 'deliveryDate', 'orderWeight', 'orderStatus', 'important', 'distance', 'description', 'actions'];
  dataSource!: MatTableDataSource<Order>;
  form: FormGroup = new FormGroup({});
  resultsLength = 0;
  isLoadingResults = true;
  isRateLimitReached = false;
  isLoading: boolean = false;
  random: Number | undefined;
  loggedInUserId: any;
  orders!: Order[];
  email: any;
  sort: any;
  paginator: any;
  OrderStatus = OrderStatus;
  isNewRecord = true;

  @ViewChild(MatSort) set matSort(ms: MatSort) {
    this.sort = ms;
  }

  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    this.paginator = mp;
  }

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
    private enumToStringPipe: EnumToStringPipe,
    private dialog: MatDialog,
    private datePipe: DatePipe,
    public globals: Globals
  ) { }
  
  getDistance(city: string) {
    const c = this.cities.find(c => c.name === city);
    return c?.marlog_distance ? `${c.marlog_distance} ק״מ` : 'לא ידוע';
  }

  hasError = (controlName: string, errorName: string) => {
    return this.form?.controls[controlName].dirty && this.form?.controls[controlName].hasError(errorName);
  };

  reset(): void {
    this.orders = JSON.parse(this.sessionStorageService.getItem('orders'));
    this.isNewRecord = true;
    this.form.reset();
    this.initForm({} as Order);
  }

  submit = (formValue: any) => {
    if (this.form?.valid) {
      this.isLoading = true;
      this.putOrder(formValue);
    }
  };

  edit(order: Order): void {
    this.isNewRecord = false;
    this.initForm(order);
  }

  delete(order: Order): void {
    const dialogRef = this.dialog.open(WarningDialogComponent, {
      width: '600px',
      data: {
        title: 'האם את\\ה בטוח\\ה?',
        message: `ההזמנה תמחק מהמערכת`,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result != undefined && result != null) {
        this.db
          .removeOrder(order)
          .then(() => {
            this.afterRemoveOrder(order);
          })
          .catch((error) => {
            console.log(error);
            this.alertService.httpError(error);
          });
      }
    });
  }

  private afterRemoveOrder(order: Order) {
    this.alertService.ok(`הפעולה בוצעה בהצלחה`, `ההזמנה נמחקה מהמערכת`);
    this.orders = this.orders.filter(o => o.uid !== order.uid);
    this.initDatasource(this.orders);
  }

  putOrder = (formValue: any) => {
    let order: Order = { ...formValue } as Order;
    order.uid = this.form.get('uid')?.value;

    this.db
      .putOrder(order, this.isNewRecord)
      .then(() => {
        this.orders = JSON.parse(this.sessionStorageService.getItem('orders'));
        this.initDatasource(this.orders);
        this.alertService.ok(
          'הפועלה בוצעה בהצלחה',
          'ההזמנה עודכנה במערכת'
        );

        this.isNewRecord = true;
        this.form.reset();
        this.initForm({} as Order);
      })
      .catch((error) => {
        console.log(error);
        this.alertService.httpError(error);
      })
      .finally(() => {
        this.isLoading = false;
      });
  };

  private getOrders() {
    this.orders = JSON.parse(this.sessionStorageService.getItem('orders'));
    this.initForm({} as Order);
  }

  private initDatasource(data: Order[]): void {
    this.dataSource = new MatTableDataSource(data);
    this.dataSource.filterPredicate = (order: Order, filter: string) => {
      return JSON.stringify(order).indexOf(filter) != -1
    };
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.sortData({ active: 'deliveryDate', direction: 'asc' });
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

    this.dataSource.data = data.sort((a: Order, b: Order) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'uid': return this.compare(a.uid, b.uid, isAsc);
        case 'deliveryCity': return this.compare(a.deliveryCity, b.deliveryCity, isAsc);
        case 'deliveryAddress': return this.compare(a.deliveryAddress, b.deliveryAddress, isAsc);
        case 'deliveryAddressNumber': return this.compare(a.deliveryAddressNumber, b.deliveryAddressNumber, isAsc);
        case 'orderWeight': return this.compare(a.orderWeight, b.orderWeight, isAsc);
        case 'orderStatus': return this.compare(a.orderStatus, b.orderStatus, isAsc);
        case 'important': return this.compare(a.important, b.important, isAsc);
        case 'description': return this.compare(a.description, b.description, isAsc);
        case 'deliveryDate': return this.compare(a.deliveryDate, b.deliveryDate, isAsc);
        default: return 0;
      }
    });
  }

  private compare(a: number | string | boolean, b: number | string | boolean, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  track(index: any, order: Order) {
    return order?.uid;
  }

  private initForm(order: Order): void {
    this.form = new FormGroup({
      uid: new FormControl(order?.uid ?? this.globals.randomAlphaNumeric(20), [Validators.required]),
      deliveryDate: new FormControl(this.datePipe.transform(order?.deliveryDate, 'yyyy-MM-dd')),
      orderWeight: new FormControl(order?.orderWeight),
      deliveryCity: new FormControl(order?.deliveryCity),
      deliveryAddress: new FormControl(order?.deliveryAddress),
      deliveryAddressNumber: new FormControl(order?.deliveryAddressNumber),
      orderStatus: new FormControl(order?.orderStatus),
      description: new FormControl(order?.description),
      important: new FormControl(order?.important),
    });

    this.db.getCitiesJSON().subscribe(data => {
      this.cities = data;
    });

    this.db.getStreetsJSON().subscribe(data => {
      this.allStreets = data;
    });

    this.filteredCities = this.form.controls['deliveryCity'].valueChanges.pipe(startWith(''), map(value => this._filterCities(value)));
    this.filteredStreets = this.form.controls['deliveryAddress'].valueChanges.pipe(startWith(''), map(value => this._filterStreets(value)));

    this.form.controls['deliveryCity'].valueChanges.subscribe(
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
    if (this.selectedCity && this.selectedCity == this.form.controls['deliveryCity'].value) {
      this.form.controls['deliveryCity'].setErrors(null);
      this.form.controls['deliveryCity'].setValue(this.selectedCity.trim());
    }
    else {
      this.form.controls['deliveryCity'].setErrors({ 'incorrect': true });
    }
  }

  streetClick(event: any) {
    this.selectedStreet = event.option.value;
  }

  checkStreet() {
    if (this.selectedStreet && this.selectedStreet == this.form.controls['deliveryAddress'].value) {
      this.form.controls['deliveryAddress'].setErrors(null);
      this.form.controls['deliveryAddress'].setValue(this.selectedStreet.trim());
    }
    else {
      this.form.controls['deliveryAddress'].setErrors({ 'incorrect': true });
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
        this.getOrders();
      }
    } else {
      this.afAuth.authState.subscribe((auth) => {
        this.loggedInUserId = auth?.uid;
        this.getOrders();
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
          return of(this.orders);
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