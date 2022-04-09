import {
  Component,
  AfterViewInit,
  ChangeDetectorRef,
  OnDestroy,
} from '@angular/core';

import { BehaviorSubject} from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';

import * as moment from "moment/moment";

import { DatabaseService } from 'src/app/services/database.service';
import { WarningDialogComponent } from 'src/app/core/warning-dialog/warning-dialog.component';
import { Order } from 'src/app/models/order.interface';
import { Route } from 'src/app/models/route.interface';
import { AlertService } from 'src/app/core/alerts/alert.service';
import { SessionStorageService } from 'src/app/core/session-storage-service';
import { DataDialogComponent } from 'src/app/core/data-dialog/data-dialog.component';
import { Driver } from 'src/app/models/driver.interface';
import { RunningInaly } from 'src/app/models/running-inlay.interface';


@Component({
  selector: 'app-orders-tracker',
  templateUrl: './orders-tracker.component.html',
  styleUrls: ['./orders-tracker.component.scss']
})
export class OrdersTrackerComponent implements AfterViewInit, OnDestroy {
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
  inlaysColumns: string[] = ['uid', 'date', 'driver', 'route', 'routeDetails', 'orders', 'actions'];
  inlays: RunningInaly[] = [];
  loading: boolean = true;

  inlaysTable: MatTableDataSource<RunningInaly> = new MatTableDataSource<RunningInaly>([]);

  constructor(
    private db: DatabaseService,
    private sessionStorageService: SessionStorageService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
  ) {
    this.db.getCitiesJSON().subscribe(data => {
      this.cities = data;
    });
  }

  getDay(deliveryDate: string): string {
    return this.days[moment(deliveryDate).toDate().getDay()];
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

  private setInlays() {
    this.inlaysTable = new MatTableDataSource<RunningInaly>(this.inlays);
  }

  private afterRemoveInlay(inlay: RunningInaly) {
    this.alertService.ok(`הפעולה בוצעה בהצלחה`, `השיבוץ נמחק`);
    this.inlays = this.inlays.filter(i => {
      if (i.uid && inlay.uid) {
        return i.uid !== inlay.uid;
      }

      return `${i.date}${i.driver.uid}${i.route.uid}` !== `${inlay.date}${inlay.driver.uid}${inlay.route.uid}`;
    });

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
    this.loadingSubscription = this.isLoading.subscribe();
    this.inlays = JSON.parse(this.sessionStorageService.getItem('running-inlays'));

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