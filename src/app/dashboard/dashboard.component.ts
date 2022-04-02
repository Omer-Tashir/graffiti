import { AfterViewInit, ChangeDetectorRef, Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { SessionStorageService } from '../core/session-storage-service';
import { UserType } from '../models/user-type.enum';
import { User } from '../models/user.interface';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, AfterViewInit {

  @ViewChild('driver')
  driverTpl!: TemplateRef<any>;

  @ViewChild('manager')
  managerTpl!: TemplateRef<any>;

  @ViewChild('distManager')
  distManagerTpl!: TemplateRef<any>;

  contentTpl!: TemplateRef<any>;
  
  UserType = UserType;

  userType!: UserType;
  loggedInUser!: User;

  constructor(
    private authService: AuthService,
    private sessionStorageService: SessionStorageService,
    private cdref: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    if (!!this.sessionStorageService.getItem('driver')) {
      this.loggedInUser = JSON.parse(this.sessionStorageService.getItem('driver'));
      this.userType = UserType.DRIVER;
    }
    else if (!!this.sessionStorageService.getItem('manager')) {
      this.loggedInUser = JSON.parse(this.sessionStorageService.getItem('manager'));
      this.userType = UserType.MANAGER;
    }
    else if (!!this.sessionStorageService.getItem('dist-manager')) {
      this.loggedInUser = JSON.parse(this.sessionStorageService.getItem('dist-manager'));
      this.userType = UserType.DIST_MANAGER;
    }
    
    this.cdref.detectChanges();
  }

  ngAfterViewInit(): void {
    switch (this.userType) {
      case UserType.DRIVER:
        this.contentTpl = this.driverTpl;
        break;
      case UserType.MANAGER:
        this.contentTpl = this.managerTpl;
        break;
      case UserType.DIST_MANAGER:
        this.contentTpl = this.distManagerTpl
        break;
    }

    this.cdref.detectChanges();
  }

  getUserTypeIndex(type: UserType) {
    return Object.keys(UserType)[Object.values(UserType).indexOf(type)];
  }

  logout() {
    this.authService.logout();
  }
}