import {
  Component,
  AfterViewInit,
  ViewChild,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  OnDestroy,
} from '@angular/core';

import { forkJoin, BehaviorSubject } from 'rxjs';
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
import { Inlay } from 'src/app/models/inlay.interfcae';
import { DataDialogComponent } from 'src/app/core/data-dialog/data-dialog.component';
import { OrderStatus } from 'src/app/models/order-status.enum';
import { Driver } from 'src/app/models/driver.interface';


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

  existDisplayedColumns: string[] = [];
  orderColumns: string[] = ['uid', 'deliveryDate', 'orderWeight', 'deliveryCity', 'deliveryAddress', 'deliveryAddressNumber', 'orderStatus', 'important', 'description', 'actions'];
  inlaysColumns: string[] = ['uid', 'date', 'route', 'order', 'driver', 'actions'];
  recommendationsDisplayedColumns: string[] = ['order', 'route', 'score'];

  OrderStatus = OrderStatus;
  orders: Order[] = [];
  inlays: Inlay[] = [];
  loading: boolean = true;

  ordersTable: MatTableDataSource<Order> = new MatTableDataSource<Order>([]);
  inlaysTable: MatTableDataSource<Inlay> = new MatTableDataSource<Inlay>([]);

  constructor(
    private router: Router,
    private db: DatabaseService,
    private sessionStorageService: SessionStorageService,
    private algorithemService: AlgorithemService,
    private afAuth: AngularFireAuth,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private globals: Globals
  ) { }

  getDeliveryDateStr(deliveryDate: string) {
    const a = moment(deliveryDate);
    const b = moment();
    const days = a.diff(b, 'days');
    if (days >= 2) {
      return `נשארו עוד ${days} ימים`;
    }
    else {
      return 'ההזמנה באיחור';
    }
  }

  removeInlay(inlay: Inlay) {
    const dialogRef = this.dialog.open(WarningDialogComponent, {
      width: '600px',
      data: {
        title: 'האם את\\ה בטוח\\ה?',
        message: `השיבוץ יימחק לצמיתות`,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result != undefined && result != null) {
        this.db
          .removeInlay(inlay)
          .then(() => {
            this.afterRemoveInlay(inlay);
          })
          .catch((error) => {
            console.log(error);
            this.alertService.httpError(error);
          });
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
    this.orders = this.orders.filter(o => ![OrderStatus.DELIVERD, OrderStatus.INLAY].includes(o.orderStatus))
    this.ordersTable = new MatTableDataSource<Order>(this.orders);
  }

  private setInlays() {
    this.inlaysTable = new MatTableDataSource<Inlay>(this.inlays);
  }

  private afterRemoveOrder(order: Order) {
    this.alertService.ok(`הפעולה בוצעה בהצלחה`, `ההזמנה נמחקה`);
    this.orders = this.orders.filter(o => o.uid !== order.uid);
    this.setOrders();
    this.setInlays();
    this.cdr.detectChanges();
  }

  private afterRemoveInlay(inlay: Inlay) {
    this.alertService.ok(`הפעולה בוצעה בהצלחה`, `השיבוץ נמחק`);
    this.inlays = this.inlays.filter(i => i.uid !== inlay.uid);
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
      this.inlays = run;
    }
    console.log(this.inlays);

    this.setOrders();
    this.setInlays();
    this.cdr.detectChanges();
  }

  ngAfterViewInit(): void {
    this.loadingSubscription = this.isLoading.subscribe();
    this.orders = JSON.parse(this.sessionStorageService.getItem('orders'));
    this.inlays = JSON.parse(this.sessionStorageService.getItem('inlays'));

    this.orders = this.orders.map(order => {
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