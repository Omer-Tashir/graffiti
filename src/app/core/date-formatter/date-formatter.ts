import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';

@Pipe({
  name: 'dateFormat'
})
export class DateFormatPipe extends DatePipe implements PipeTransform {
  transform(value: any, args?: any): any {
    return super.transform(value, 'dd/MM/yyyy');
  }
}

@Pipe({
  name: 'yearDateFormat'
})
export class YearDateFormatPipe extends DatePipe implements PipeTransform {
  transform(value: any, args?: any): any {
    return super.transform(value, 'dd MMM');
  }
}

@Pipe({
  name: 'timeFormat'
})
export class TimeFormatPipe extends DatePipe implements PipeTransform {
  transform(value: any, args?: any): any {
    return super.transform(value, 'HH:mm:ss');
  }
}

@Pipe({
  name: 'dateTimeFormat'
})
export class DateTimeFormatPipe extends DatePipe implements PipeTransform {
  transform(value: any, args?: any): any {
    return super.transform(value, `dd/MM/yyyy HH:mm:ss`);
  }
}