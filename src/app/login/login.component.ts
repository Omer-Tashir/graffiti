import { Component } from '@angular/core';
import { UserType } from '../models/user-type.enum';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {

  constructor(
    private readonly authService: AuthService
  ) { }

  login(loginData: any) {
    this.authService.login(loginData.email, loginData.password, loginData.userType);
  }
}