import { Location } from '@angular/common'
import { Component, OnInit } from '@angular/core';
import { SessionStorageService } from './core/session-storage-service';
import * as moment from 'moment/moment';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  
  constructor(
    public location: Location,
    private sessionStorageService: SessionStorageService
  ) {
    moment.locale("he");
  }

  isUserLoggedIn(): boolean {
    return !!this.sessionStorageService.getItem('user');
  }
  
  ngOnInit(): void {
  }
}
