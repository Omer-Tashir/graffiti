import {
  Component,
  AfterViewInit,
  ChangeDetectorRef,
  OnDestroy,
  OnInit,
} from '@angular/core';

import { BehaviorSubject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';

import * as moment from "moment/moment";

import { DatabaseService } from 'src/app/services/database.service';
import { Order } from 'src/app/models/order.interface';
import { Route } from 'src/app/models/route.interface';
import { SessionStorageService } from 'src/app/core/session-storage-service';
import { DataDialogComponent } from 'src/app/core/data-dialog/data-dialog.component';
import { RunningInaly } from 'src/app/models/running-inlay.interface';
import { Driver } from 'src/app/models/driver.interface';
import { Location } from '@angular/common';

@Component({
  selector: 'app-driver-routes',
  templateUrl: './driver-routes.component.html',
  styleUrls: ['./driver-routes.component.scss']
})
export class DriverRoutesComponent implements AfterViewInit, OnDestroy, OnInit {
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
  inlaysColumns: string[] = ['date', 'route', 'routeDetails', 'orders'];
  inlays: RunningInaly[] = [];
  loading: boolean = true;
  type: any = 'history';

  inlaysTable: MatTableDataSource<RunningInaly> = new MatTableDataSource<RunningInaly>([]);

  constructor(
    private db: DatabaseService,
    private route: ActivatedRoute,
    private sessionStorageService: SessionStorageService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    public location: Location,
  ) {
    this.db.getCitiesJSON().subscribe(data => {
      this.cities = data;
    });
  }

  getDay(deliveryDate: string): string {
    return this.days[moment(deliveryDate).toDate().getDay()];
  }

  private setInlays() {
    this.inlaysTable = new MatTableDataSource<RunningInaly>(this.inlays);
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
        title: 'הזמנה: ' + `${order.deliveryCity}, ${order.deliveryAddress} ${order.deliveryAddressNumber}`,
      },
    });
  }

  getRouteDraw(orders: Order[]): string {
    const o = [{ deliveryAddress: 'מרלוג', deliveryAddressNumber: '' } as Order, ...orders];
    return o.map(o => `${o.deliveryAddress} ${o.deliveryAddressNumber}`.trim()).join(' -> ').concat(' -> מרלוג');
  }

  getRouteTotalWeight(orders: Order[]): number {
    return +orders.reduce((p, c) => p + c.orderWeight, 0).toFixed(2);
  }

  ngOnInit(): void {
    this.type = this.route.snapshot.paramMap.get('type');
  }

  ngAfterViewInit(): void {
    this.loadingSubscription = this.isLoading.subscribe();
    const driver: Driver = JSON.parse(this.sessionStorageService.getItem('user'));
    this.inlays = JSON.parse(this.sessionStorageService.getItem('running-inlays'));
    this.inlays = this.inlays.filter((i: RunningInaly) => i.driver?.uid === driver.uid);

    if (this.type === 'history') {
      this.inlays = this.inlays.filter((i: RunningInaly) => moment(i.date).isBefore(new Date));
    }
    else {
      this.inlays = this.inlays.filter((i: RunningInaly) => moment(i.date).isSameOrAfter(new Date));
    }

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
