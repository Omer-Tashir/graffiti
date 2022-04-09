import {
  Component,
  AfterViewInit,
  ViewChild,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  OnDestroy,
} from '@angular/core';

import { forkJoin, BehaviorSubject, merge, combineLatest, EMPTY } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { FormControl, Validators } from '@angular/forms';
import { MatSort, Sort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';

import * as moment from "moment/moment";

import { DatabaseService } from 'src/app/services/database.service';
import { WarningDialogComponent } from 'src/app/core/warning-dialog/warning-dialog.component';
import { Order } from 'src/app/models/order.interface';
import { Route } from 'src/app/models/route.interface';
import { AlgorithemService } from 'src/app/core/algorithem.service';
import { AlertService } from 'src/app/core/alerts/alert.service';
import { Globals } from 'src/app/app.globals';
import { SessionStorageService } from 'src/app/core/session-storage-service';
import { DataDialogComponent } from 'src/app/core/data-dialog/data-dialog.component';
import { OrderStatus } from 'src/app/models/order-status.enum';
import { Driver } from 'src/app/models/driver.interface';
import { DatePipe } from '@angular/common';
import { catchError, first, startWith, tap } from 'rxjs/operators';
import { RunningInaly } from 'src/app/models/running-inlay.interface';


@Component({
  selector: 'app-scheduling',
  templateUrl: './scheduling.component.html',
  styleUrls: ['./scheduling.component.scss']
})
export class SchedulingComponent implements AfterViewInit, OnDestroy {
  public isLoading: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  public loadingSubscription: any;

  days: string[] = [
    'ראשון',
    'שני',
    'שלישי',
    'רביעי',
    'חמישי',
    'שישי',
    'שבת'
  ];

  private cities: any[] = [];
  existDisplayedColumns: string[] = [];
  orderColumns: string[] = ['uid', 'deliveryDate', 'orderWeight', 'deliveryCity', 'deliveryAddress', 'deliveryAddressNumber', 'orderStatus', 'important', 'description', 'actions'];
  inlaysColumns: string[] = ['uid', 'date', 'driver', 'route', 'routeDetails', 'orders', 'actions'];
  recommendationsDisplayedColumns: string[] = ['order', 'route', 'score'];

  OrderStatus = OrderStatus;
  orders: Order[] = [];
  originalOrders: Order[] = [];
  inlays: RunningInaly[] = [];
  loading: boolean = true;

  fromDeliveryDate = new FormControl(this.datePipe.transform(moment().startOf('day').toDate(), 'yyyy-MM-dd'));
  toDeliveryDate = new FormControl(this.datePipe.transform(moment().startOf('day').add(2, 'days').toDate(), 'yyyy-MM-dd'));

  ordersTable: MatTableDataSource<Order> = new MatTableDataSource<Order>([]);
  inlaysTable: MatTableDataSource<RunningInaly> = new MatTableDataSource<RunningInaly>([]);

  constructor(
    private router: Router,
    private datePipe: DatePipe,
    private db: DatabaseService,
    private sessionStorageService: SessionStorageService,
    private algorithemService: AlgorithemService,
    private afAuth: AngularFireAuth,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private globals: Globals
  ) {
    this.db.getCitiesJSON().subscribe(data => {
      this.cities = data;
    });
  }

  getDay(deliveryDate: string): string {
    return this.days[moment(deliveryDate).toDate().getDay()];
  }

  getDeliveryDateStr(deliveryDate: string) {
    const a = moment(deliveryDate);
    const b = moment();
    const days = a.diff(b, 'days');
    if (days >= 0) {
      return `נשארו עוד ${days+1} ימים`;
    }
    else {
      return 'ההזמנה באיחור';
    }
  }

  removeInlay(inlay: RunningInaly) {
    const dialogRef = this.dialog.open(WarningDialogComponent, {
      width: '600px',
      data: {
        title: 'האם את\\ה בטוח\\ה?',
        message: `השיבוץ יימחק לצמיתות`,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result != undefined && result != null) {
        if (inlay.uid) {          
          this.db
            .removeRunningInlay(inlay)
            .then(() => {
              this.afterRemoveInlay(inlay);
            })
            .catch((error) => {
              console.log(error);
              this.alertService.httpError(error);
            });
        }
        else {
          this.afterRemoveInlay(inlay);
        }
      }
    });
  }

  removeOrder(order: Order) {
    const dialogRef = this.dialog.open(WarningDialogComponent, {
      width: '600px',
      data: {
        title: 'האם את\\ה בטוח\\ה?',
        message: `ההזמנה תמחק לצמיתות`,
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

  private setOrders() {
    this.orders = this.originalOrders
      .filter((o: Order) => ![OrderStatus.DELIVERD, OrderStatus.INLAY].includes(o.orderStatus))
      .filter((o: Order) => moment(o.deliveryDate).isBetween(moment(this.fromDeliveryDate.value), moment(this.toDeliveryDate.value), 'days', '[]'))
    
    this.ordersTable = new MatTableDataSource<Order>(this.orders);
  }

  private setInlays() {
    this.inlaysTable = new MatTableDataSource<RunningInaly>(this.inlays);
  }

  private afterRemoveOrder(order: Order) {
    this.alertService.ok(`הפעולה בוצעה בהצלחה`, `ההזמנה נמחקה`);
    this.originalOrders = this.originalOrders.filter(o => o.uid !== order.uid);
    this.setOrders();
    this.setInlays();
    this.cdr.detectChanges();
  }

  private afterRemoveInlay(inlay: RunningInaly) {
    this.alertService.ok(`הפעולה בוצעה בהצלחה`, `השיבוץ נמחק`);
    this.inlays = this.inlays.filter(i => {
      if (i.uid && inlay.uid) {
        return i.uid !== inlay.uid;
      }

      return `${i.date}${i.driver.uid}${i.route.uid}` !== `${inlay.date}${inlay.driver.uid}${inlay.route.uid}`;
    });

    this.setOrders();
    this.setInlays();
    this.cdr.detectChanges();
  }

  showRoute(route: Route) {
    this.dialog.open(DataDialogComponent, {
      width: '700px',
      data: {
        route,
        title: 'מסלול: ' + route.name,
      },
    });
  }

  showOrder(order: Order) {
    this.dialog.open(DataDialogComponent, {
      width: '700px',
      data: {
        order,
        title: 'הזמנה: ' + order.uid,
      },
    });
  }

  showDriver(driver: Driver) {
    this.dialog.open(DataDialogComponent, {
      width: '700px',
      data: {
        driver,
        title: 'נהג: ' + driver.displayName,
      },
    });
  }

  runAlgorithem(): void {
    const run = this.algorithemService.run(this.orders);
    if (run?.length) {
      if (!this.inlays) {
        this.inlays = [];
      }
      
      this.inlays = [...this.inlays, ...run].sort((a, b) => a.date - b.date);
      this.setOrders();
      this.setInlays();
      this.cdr.detectChanges();
    }
    else {
        this.alertService.ok(`האלגוריתם הורץ בהצלחה`, `לא נמצאו שיבוצים אפשריים עבור טווח התאריכים`);
    }
  }

  inlaysAgree(): void {
    const inlaysReq = [];
    for (let inlay of this.inlays) {
      inlaysReq.push(this.db.putRunningInlay(inlay, !inlay.uid));
    }

    forkJoin(inlaysReq).pipe(
      first(),
      tap(() => this.setOrders()),
      tap(() => this.setInlays()),
      tap(() => this.alertService.ok(`הפעולה בוצעה בהצלחה`, `השיבוצים נשמרו`)),
      catchError(error => {
        console.log(error);
        this.alertService.ok(`הפעולה נכשלה`, `השיבוצים לא נשמרו במערכת`);
        return EMPTY;
      })
    ).subscribe();
  }

  isOrderDelay(order: Order): boolean {
    return this.getDeliveryDateStr(order.deliveryDate) === 'ההזמנה באיחור';
  }

  getRouteDraw(orders: Order[]): string {
    const o = [{ deliveryCity: 'מרלוג' } as Order, ...orders];
    return o.map(o => o.deliveryCity).join(' -> ');
  }

  getRouteDistance(orders: Order[]): string {
    const firstCity = this.cities.find(c => c.name === orders[0].deliveryCity);
    const lastCity = this.cities.find(c => c.name === orders[orders.length - 1].deliveryCity);
    if (firstCity?.marlog_distance && lastCity?.marlog_distance) {
      const km = Math.round(Math.abs(+lastCity.marlog_distance - +firstCity.marlog_distance) + +firstCity.marlog_distance);
      return `${km}km`;
    }
    else {
      return ``;
    }
  }

  ngAfterViewInit(): void {
    combineLatest([this.fromDeliveryDate.valueChanges.pipe(startWith(this.fromDeliveryDate.value)), this.toDeliveryDate.valueChanges.pipe(startWith(this.toDeliveryDate.value))]).pipe(
      tap(() => this.setOrders())
    ).subscribe();

    this.loadingSubscription = this.isLoading.subscribe();
    this.orders = JSON.parse(this.sessionStorageService.getItem('orders'));
    this.originalOrders = JSON.parse(this.sessionStorageService.getItem('orders'));
    this.inlays = JSON.parse(this.sessionStorageService.getItem('running-inlays'));

    this.orders = this.orders.map(order => {
      order.important = order.important || this.getDeliveryDateStr(order.deliveryDate) === 'ההזמנה באיחור';
      return order;
    });

    this.originalOrders = this.originalOrders.map(order => {
      order.important = order.important || this.getDeliveryDateStr(order.deliveryDate) === 'ההזמנה באיחור';
      return order;
    });

    this.setOrders();
    this.setInlays();
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    if (this.loadingSubscription != undefined) {
      this.loadingSubscription.unsubscribe();
      this.loadingSubscription = undefined;
    }
  }
}