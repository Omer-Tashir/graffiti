import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-driver',
  templateUrl: './dashboard-driver.component.html',
  styleUrls: ['./dashboard-driver.component.scss']
})
export class DashboardDriverComponent implements OnInit {

  constructor(
    private router: Router
  ) { }

  navigate(url: string[]): void {
    this.router.navigate(url);
  }

  ngOnInit(): void {
  }
}
