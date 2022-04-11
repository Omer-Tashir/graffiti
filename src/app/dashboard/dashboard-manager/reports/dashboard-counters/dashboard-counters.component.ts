import { Component, OnInit, ChangeDetectionStrategy, ViewChild } from '@angular/core';
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

@Component({
  selector: 'dashboard-counters',
  templateUrl: './dashboard-counters.component.html',
  styleUrls: ['./dashboard-counters.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardCountersComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart!: BaseChartDirective;
  
  private ordersMap: Map<string, any> = new Map<string, any>();
  private chartColors: Map<string, string> = new Map<string, string>();

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

  constructor(
    public sessionStorageService: SessionStorageService,
    public afAuth: AngularFireAuth,
    public globals: Globals
  ) { }

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
    this.doughnutChartLabels = Array.from(this.ordersMap.keys());
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

    this.doughnutChartPlugins[0].beforeInit = (chart: any, options) => {
      chart.legend.afterFit = function () {
        this.height = 160;
      };
    };
  }

  ngOnInit(): void {
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
}
