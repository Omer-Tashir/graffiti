import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  RouterStateSnapshot,
} from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class isLoggedInGuard implements CanActivate {
  constructor() { }
  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      !!sessionStorage.getItem('user') ? resolve(true) : reject();
    });
  }
}

@Injectable({
  providedIn: 'root',
})
export class isManagerGuard implements CanActivate {
  constructor() {}
  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      !!sessionStorage.getItem('manager') ? resolve(true) : reject();
    });
  }
}

@Injectable({
  providedIn: 'root',
})
export class isDriverGuard implements CanActivate {
  constructor() { }
  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      !!sessionStorage.getItem('driver') ? resolve(true) : reject();
    });
  }
}

@Injectable({
  providedIn: 'root',
})
export class isDriverOrDistManagerGuard implements CanActivate {
  constructor() { }
  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      !!sessionStorage.getItem('dist-manager') || !!sessionStorage.getItem('driver') ? resolve(true) : reject();
    });
  }
}

@Injectable({
  providedIn: 'root',
})
export class isDistManagerGuard implements CanActivate {
  constructor() {}
  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      !!sessionStorage.getItem('dist-manager') ? resolve(true) : reject();
    });
  }
}

@Injectable({
  providedIn: 'root',
})
export class isDistManagerOrManageGuard implements CanActivate {
  constructor() { }
  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      !!sessionStorage.getItem('dist-manager') || !!sessionStorage.getItem('manager') ? resolve(true) : reject();
    });
  }
}