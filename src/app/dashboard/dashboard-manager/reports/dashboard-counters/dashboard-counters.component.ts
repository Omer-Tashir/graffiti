import { DatePipe, Location } from '@angular/common';
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
import { BehaviorSubject, combineLatest, merge } from 'rxjs';

import * as moment from 'moment/moment';
import * as XLSX from 'xlsx'; 
import { FormControl } from '@angular/forms';
import { Sort } from '@angular/material/sort';
import { startWith, tap } from 'rxjs/operators';

@Component({
  selector: 'dashboard-counters',
  templateUrl: './dashboard-counters.component.html',
  styleUrls: ['./dashboard-counters.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardCountersComponent implements OnInit, AfterViewInit, OnDestroy {
  public isLoading: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  public loadingSubscription: any;

  driversCtrl = new FormControl();
  displayedColumns: string[] = ['name', 'phone', 'deliveryCity', 'deliveryAddress', 'deliveryAddressNumber', 'deliveryDate', 'orderWeight', 'orderStatus', 'important', 'description'];
  dataSource!: MatTableDataSource<Order>;
  OrderStatus = OrderStatus;

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

  fromDeliveryDate = new FormControl(this.datePipe.transform(moment().startOf('day').toDate(), 'yyyy-MM-dd'));
  toDeliveryDate = new FormControl(this.datePipe.transform(moment().startOf('day').add(2, 'days').toDate(), 'yyyy-MM-dd'));

  inlaysTable: MatTableDataSource<RunningInaly> = new MatTableDataSource<RunningInaly>([]);

  constructor(
    public location: Location,
    public sessionStorageService: SessionStorageService,
    public afAuth: AngularFireAuth,
    public globals: Globals,
    private db: DatabaseService,
    private datePipe: DatePipe,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
  ) {
    this.db.getCitiesJSON().subscribe(data => {
      this.cities = data;
      this.cdr.detectChanges();
    });
  }

  private getOrders() {
    this.orders = JSON.parse(this.sessionStorageService.getItem('orders'));
    this.cdr.detectChanges();
  }

  private initDatasource(data: Order[]): void {
    this.dataSource = new MatTableDataSource(data);
    this.dataSource.filterPredicate = (order: Order, filter: string) => {
      return JSON.stringify(order).indexOf(filter) != -1
    };
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

  getDay(deliveryDate: string): string {
    return this.days[moment(deliveryDate).toDate().getDay()];
  }

  private setInlays() {
    this.inlaysTable = new MatTableDataSource<RunningInaly>(this.inlays);
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
    const o = [{ deliveryAddress: 'מרלוג', deliveryAddressNumber: '' } as Order, ...orders];
    return o.map(o => `${o.deliveryAddress} ${o.deliveryAddressNumber}`.trim()).join(' -> ').concat(' -> מרלוג');
  }

  getRouteTotalWeight(orders: Order[]): number {
    return +orders.reduce((p, c) => p + c.orderWeight, 0).toFixed(2);
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
    this.drivers = JSON.parse(this.sessionStorageService.getItem('drivers'))
      .sort((d1: Driver, d2: Driver) => d1.displayName.localeCompare(d2.displayName));
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

    this.cdr.detectChanges();
  }

  ngOnInit(): void {
    this.today = moment().format('LLLL');
    this.orders = JSON.parse(this.sessionStorageService.getItem('orders'));

    // Look for logged in user first
    if (sessionStorage.getItem('user') != null) {
      let temp = sessionStorage.getItem('user');
      if (temp != null) {
        let user = JSON.parse(temp);
        this.loggedInUserId = user?.uid;
        this.getData();
        this.getOrders();
      }
    } else {
      this.afAuth.authState.subscribe((auth) => {
        this.loggedInUserId = auth?.uid;
        this.getData();
        this.getOrders();
      });
    }

    combineLatest([
      this.fromDeliveryDate.valueChanges.pipe(startWith(this.fromDeliveryDate.value)),
      this.toDeliveryDate.valueChanges.pipe(startWith(this.toDeliveryDate.value))
    ]).pipe(
      tap(() => this.initDatasource(this.orders
        .filter((o: Order) => moment(o.deliveryDate).isBetween(moment(this.fromDeliveryDate.value), moment(this.toDeliveryDate.value), 'days', '[]'))))
    ).subscribe();

    this.cdr.detectChanges();
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
