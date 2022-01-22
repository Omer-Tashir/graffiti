import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class SessionStorageService {

  constructor() { }

  public setItem(key: string, value: string) {
    sessionStorage.setItem(key, value);
  }
    
  public getItem(key: string): any { 
    return sessionStorage.getItem(key);
  }

  public removeItem(key:string) {
    sessionStorage.removeItem(key);
  }

  public clear() {
    sessionStorage.clear(); 
  }
}