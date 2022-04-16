import { Location } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy, ViewChild, ChangeDetectorRef, AfterViewInit, OnDestroy } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { ChartOptions, ChartType } from 'chart.js';
import { BaseChartDirective, Color, Label, MultiDataSet, PluginServiceGlobalRegistrationAndOptions } from 'ng2-charts';
import { Globals } from 'src/app/app.globals';
import { SessionStorageService } from 'src/app/core/session-storage-service';
import { DriverConstraint } from 'src/app/models/driver-constraint';
import { Driver } from 'src/app/models/driver.interface';
import { OrderStatus } from 'src/app/models/order-status.enum';
import { Order } from 'src/app/models/order.interface';
import { Route } from 'src/app/models/route.interface';
import { RunningInaly } from 'src/app/models/running-inlay.interface';

import { DataDialogComponent } from 'src/app/core/data-dialog/data-dialog.component';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { AlertService } from 'src/app/core/alerts/alert.service';
import { DatabaseService } from 'src/app/services/database.service';
import { BehaviorSubject } from 'rxjs';

import * as moment from 'moment/moment';
import * as XLSX from 'xlsx'; 

@Component({
  selector: 'dashboard-counters',
  templateUrl: './dashboard-counters.component.html',
  styleUrls: ['./dashboard-counters.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardCountersComponent implements OnInit, AfterViewInit, OnDestroy {
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
  inlaysColumns: string[] = ['date', 'driver', 'route', 'routeDetails', 'orders'];
  loading: boolean = true;

  inlaysTable: MatTableDataSource<RunningInaly> = new MatTableDataSource<RunningInaly>([]);

  constructor(
    public location: Location,
    public sessionStorageService: SessionStorageService,
    public afAuth: AngularFireAuth,
    public globals: Globals,
    private db: DatabaseService,
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

  getRouteTotalWeight(orders: Order[]): number {
    return +orders.reduce((p, c) => p + c.orderWeight, 0).toFixed(2);
  }

  getRouteTotalTime(orders: Order[]) {
    const firstCity = this.cities.find(c => c.name === orders[0].deliveryCity);
    const lastCity = this.cities.find(c => c.name === orders[orders.length - 1].deliveryCity);
    if (firstCity?.marlog_distance && lastCity?.marlog_distance) {
      let time = Math.round(Math.abs(+lastCity.marlog_distance - +firstCity.marlog_distance) + +firstCity.marlog_distance)  / 100;
      time += ((5 / 60) * orders.length);
      return time >= 1 ? `${Math.floor(time)} שעות, ${((time - Math.floor(time)) * 60).toFixed(0)} דקות` : `${(time * 60).toFixed(0)} דקות`;
    }

    return 'לא ידוע';
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

  @ViewChild(BaseChartDirective) chart!: BaseChartDirective;
  
  private ordersMap: Map<string, any> = new Map<string, any>();
  private chartColors: Map<string, string> = new Map<string, string>();

  today: any;
  totalOrders: number = 0;
  doughnutChartLabels: Label[] = [];
  doughnutChartData: MultiDataSet = [[]];
  doughnutChartType: ChartType = 'doughnut';
  doughnutChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutoutPercentage: 65,
    tooltips: {
      bodyFontSize: 14,
      titleFontSize: 14,
      footerFontFamily: '"Lato", sans-serif',
      bodyFontFamily: '"Lato", sans-serif',
      titleFontFamily: '"Lato", sans-serif',
      displayColors: false,
      callbacks: {
        title: (tooltipItem: any, data: any) => {
          return "" + data.labels[tooltipItem[0].index];
        },
        label: (tooltipItem: any, data: any) => {
          return data.datasets[0].data[tooltipItem.index] + ' הזמנות';
        }
      }
    },
    legend: {
      display: true,
      position: 'bottom',
      align: 'end',
      labels: {
        padding: 18,
        boxWidth: 14,
        fontSize: 14,
        fontColor: '#95949A',
        fontFamily: '"Lato", sans-serif'
      },
    },
    plugins: {
      datalabels: {
        anchor: 'center',
        align: 'center',
        color: '#000000',
        font: {
          family: '"Lato", sans-serif',
          size: 14
        }
      }
    },
    layout: {
      padding: {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }
    }
  };

  doughnutChartPlugins: PluginServiceGlobalRegistrationAndOptions[] = [{}];
  doughnutChartColors: Color[] = [{ backgroundColor: [] }];

  inlays: RunningInaly[] = [];
  orders: Order[] = [];
  drivers: Driver[] = [];
  routes: Route[] = [];
  driverConstraints: DriverConstraint[] = [];
  
  random: Number | undefined;
  loggedInUserId: any;

  countUpOptions = {
    duration: 1,
    useGrouping: true,
    useEasing: true
  }

  countUpOptionsCounter = {
    decimalPlaces: 0,
    ...this.countUpOptions
  };

  countUpOptionsAvg = {
    decimalPlaces: 1,
    ...this.countUpOptions
  };

  getData(): void {
    this.inlays = JSON.parse(this.sessionStorageService.getItem('running-inlays'));
    this.orders = JSON.parse(this.sessionStorageService.getItem('orders'));
    this.drivers = JSON.parse(this.sessionStorageService.getItem('drivers'));
    this.routes = JSON.parse(this.sessionStorageService.getItem('routes'));
    this.driverConstraints = JSON.parse(this.sessionStorageService.getItem('driver-constraints'));

    this.chartColors.set(OrderStatus.PENDING, '#72AFF2');
    this.chartColors.set(OrderStatus.REFUND, '#B4EDD2');
    this.chartColors.set(OrderStatus.INLAY, '#BFBFF3');
    this.chartColors.set(OrderStatus.DELIVERD, '#EFA368');

    for (let order of this.orders) {
      if (this.ordersMap.has(order.orderStatus)) {
        this.ordersMap.set(order.orderStatus,
          {color: this.chartColors.get(order.orderStatus), value: +this.ordersMap.get(order.orderStatus).value + 1});
      }
      else {
        this.ordersMap.set(order.orderStatus, { color: this.chartColors.get(order.orderStatus), value: 0 });
      }
    }

    this.totalOrders = this.orders.length;
    this.doughnutChartData[0] = Array.from(this.ordersMap.values()).map(a => a.value);
    this.doughnutChartLabels = Array.from(this.ordersMap.keys()).filter(Boolean);
    this.doughnutChartColors[0].backgroundColor = Array.from(this.ordersMap.values()).map(a => a.color);
    this.doughnutChartPlugins[0].beforeDraw = (chart: any) => {
      const ctx = chart.ctx;
      if (ctx && chart) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const centerX = ((chart.chartArea.left + chart.chartArea.right) / 2);
        const centerY = ((chart.chartArea.top + chart.chartArea.bottom) / 2) - 15;
  
        ctx.font = '700 18px "Lato", sans-serif';
        ctx.fillStyle = '#2B2A35';
  
        ctx.fillText(this.totalOrders, centerX, centerY);
  
        ctx.font = '400 14px "Lato", sans-serif';
        ctx.fillText('הזמנות', centerX, centerY + 30);
  
        chart.legend.top = 310;
        chart.legend.bottom = 0;
      }
    };

    this.doughnutChartPlugins[0].beforeInit = (chart: any, options: any) => {
      chart.legend.afterFit = function () {
        this.height = 160;
      };
    };
  }

  ngOnInit(): void {
    this.today = moment().format('LLLL');

    // Look for logged in user first
    if (sessionStorage.getItem('user') != null) {
      let temp = sessionStorage.getItem('user');
      if (temp != null) {
        let user = JSON.parse(temp);
        this.loggedInUserId = user?.uid;
        this.getData();
      }
    } else {
      this.afAuth.authState.subscribe((auth) => {
        this.loggedInUserId = auth?.uid;
        this.getData();
      });
    }
  }

  export() {
    const fileName = `דו״ח פעילות - ${this.today}.xlsx`; 
    let element = document.getElementById('excel-table'); 
    const ws: XLSX.WorkSheet =XLSX.utils.table_to_sheet(element);

    /* generate workbook and add the worksheet */
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    /* save to file */
    XLSX.writeFile(wb, fileName);
  }
}
