import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-manager',
  templateUrl: './dashboard-manager.component.html',
  styleUrls: ['./dashboard-manager.component.scss']
})
export class DashboardManagerComponent implements OnInit {

  constructor(
    private router: Router
  ) { }

  navigate(url: string[]): void {
    this.router.navigate(url);
  }

  ngOnInit(): void {
  }
}
