import { animate, animateChild, query, stagger, state, style, transition, trigger } from '@angular/animations';
import { AfterViewInit, Component, EventEmitter, HostBinding } from '@angular/core';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
  animations: [
    trigger('fadeInUpAllAnimation', [
      transition(':enter', [
        query('@*', stagger(100, animateChild()), { optional: true })
      ])
    ]),
    trigger('item', [
      state('void', style({ opacity: 0, transform: 'translateY(-5%)' })),
      transition(':enter', [
        animate(`.7s ease`, style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
    ])
  ]
})
export class ReportsComponent implements AfterViewInit {

  refresh$: EventEmitter<void> = new EventEmitter<void>();

  constructor(
  ) { }

  ngAfterViewInit(): void {
    
  }

  @HostBinding('@fadeInUpAllAnimation')
  get hostAnimation() {
    return true;
  }
}