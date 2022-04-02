import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-dist-manager',
  templateUrl: './dashboard-dist-manager.component.html',
  styleUrls: ['./dashboard-dist-manager.component.scss']
})
export class DashboardDistManagerComponent implements OnInit {

  constructor(
    private router: Router
  ) { }

  navigate(url: string[]): void {
    this.router.navigate(url);
  }

  ngOnInit(): void {
  }
}
