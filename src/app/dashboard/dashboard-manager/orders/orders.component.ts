import { DatePipe, Location } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
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

import * as moment from 'moment';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['name', 'phone', 'deliveryCity', 'deliveryAddress', 'deliveryAddressNumber', 'deliveryDate', 'orderWeight', 'orderStatus', 'important', 'description', 'actions'];
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
    public globals: Globals,
    public location: Location,
    public cdr: ChangeDetectorRef,
  ) { }

  hasError = (controlName: string, errorName: string) => {
    return this.form?.controls[controlName].dirty && this.form?.controls[controlName].hasError(errorName);
  };

  reset(): void {
    this.orders = JSON.parse(this.sessionStorageService.getItem('orders'));
    this.isNewRecord = true;
    this.form.reset();
    this.initForm({} as Order);
    this.cdr.detectChanges();
  }

  submit = (formValue: any) => {
    if (this.form?.valid) {
      this.isLoading = true;
      this.putOrder(formValue);
      this.cdr.detectChanges();
    }
  };

  edit(order: Order): void {
    this.isNewRecord = false;
    this.initForm(order);
    this.cdr.detectChanges();
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
            this.cdr.detectChanges();
          });
      }
    });
  }

  private afterRemoveOrder(order: Order) {
    this.alertService.ok(`הפעולה בוצעה בהצלחה`, `ההזמנה נמחקה מהמערכת`);
    this.orders = this.orders.filter(o => o.uid !== order.uid);
    this.initDatasource(this.orders);
    this.cdr.detectChanges();
  }

  putOrder = (formValue: any) => {
    let order: Order = { ...formValue } as Order;
    order.uid = this.form.get('uid')?.value;
    this.cdr.detectChanges();

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
        this.cdr.detectChanges();
      })
      .catch((error) => {
        console.log(error);
        this.alertService.httpError(error);
        this.cdr.detectChanges();
      })
      .finally(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      });
  };

  private getOrders() {
    this.orders = JSON.parse(this.sessionStorageService.getItem('orders'));
    this.initForm({} as Order);
    this.cdr.detectChanges();
  }

  private initDatasource(data: Order[]): void {
    this.dataSource = new MatTableDataSource(data);
    this.dataSource.filterPredicate = (order: Order, filter: string) => {
      return JSON.stringify(order).indexOf(filter) != -1
    };
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.sortData({ active: 'deliveryDate', direction: 'asc' });
    this.cdr.detectChanges();
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    this.cdr.detectChanges();
  }

  sortData(sort: Sort) {
    const data = this.dataSource.data.slice();
    if (!sort.active || sort.direction === '') {
      this.dataSource.data = data;
      this.cdr.detectChanges();
      return;
    }

    this.dataSource.data = data.sort((a: Order, b: Order) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'uid': return this.compare(a.uid, b.uid, isAsc);
        case 'name': return this.compare(a.name, b.name, isAsc);
        case 'phone': return this.compare(a.phone, b.phone, isAsc);
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

    this.cdr.detectChanges();
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
      name: new FormControl(order?.name, [Validators.required]),
      phone: new FormControl(order?.phone, [Validators.required]),
      deliveryDate: new FormControl(this.datePipe.transform(order?.deliveryDate, 'yyyy-MM-dd'), [Validators.required]),
      orderWeight: new FormControl(order?.orderWeight, [Validators.required]),
      deliveryCity: new FormControl(order?.deliveryCity, [Validators.required]),
      deliveryAddress: new FormControl(order?.deliveryAddress, [Validators.required]),
      deliveryAddressNumber: new FormControl(order?.deliveryAddressNumber),
      orderStatus: new FormControl(order?.orderStatus ?? OrderStatus.PENDING, [Validators.required]),
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

        this.cdr.detectChanges();
      }
    );

    this.cdr.detectChanges();
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

  onFileChange(event: any) {
    this.isLoading = true;

    /* wire up file reader */
    const target: DataTransfer = <DataTransfer>(event.target);
    if (target.files.length !== 1) {
      throw new Error('Cannot use multiple files');
    }
    const reader: FileReader = new FileReader();
    reader.readAsBinaryString(target.files[0]);
    reader.onload = (e: any) => {
      /* create workbook */
      const binarystr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(binarystr, { type: 'binary' });

      /* selected the first sheet */
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];

      /* save data */
      const data: any = XLSX.utils.sheet_to_json(ws); // to get 2d array pass 2nd parameter as object {header: 1}
      console.log(data);

      for (let i = 0; i < data.length; i++) {
        let order: Order = {
          uid: this.globals.randomAlphaNumeric(20),
          name: data[i]['שם לקוח'] ?? '',
          phone: data[i]['טלפון'] ?? '',
          deliveryCity: data[i]['עיר'] ?? '',
          deliveryAddress: data[i]['רחוב'] ?? '',
          deliveryAddressNumber: data[i]['מספר בית'] ?? '',
          deliveryDate: moment(data[i]['תאריך אספקה'], "DD/MM/YYYY").format("YYYY-MM-DD"),
          orderWeight: +data[i]['משקל הזמנה'] ?? '',
          orderStatus: OrderStatus.PENDING,
          important: data[i]['הזמנה דחופה?'] ? data[i]['הזמנה דחופה?'] == 'לא' ? false : true : false,
          description: data[i]['הערות'] ?? ''
        } as Order;

        this.db
          .putOrder(order, true)
          .then(() => {
            this.orders = JSON.parse(this.sessionStorageService.getItem('orders'));
            this.initDatasource(this.orders);
          })
          .catch((error) => {
            console.log(error);
            this.alertService.httpError(error);
          })
          .finally(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
          });
      }

      this.alertService.ok(
        'הפועלה בוצעה בהצלחה',
        'הקובץ נטען במערכת'
      );

      this.isNewRecord = true;
      this.form.reset();
      this.initForm({} as Order);
    };

    this.cdr.detectChanges();
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
        this.cdr.detectChanges();
      }
    } else {
      this.afAuth.authState.subscribe((auth) => {
        this.loggedInUserId = auth?.uid;
        this.getOrders();
        this.cdr.detectChanges();
      });
    }
  }

  ngAfterViewInit(): void {
    this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0);
    this.cdr.detectChanges();

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
        this.cdr.detectChanges();
      });
  }
}