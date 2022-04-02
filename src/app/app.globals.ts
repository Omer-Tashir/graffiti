import { Injectable } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

export const Days = [
  'ראשון',
  'שני',
  'שלישי',
  'רביעי',
  'חמישי',
  'שישי',
  'שבת'
];

export const Months = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
];

@Injectable()
export class Globals {
  static readonly TIME_FMT = 'HH:mm:ss';
  static readonly DATE_FMT = 'dd/MM/yyyy';
  static readonly ISO_DATE_FMT = 'yyyy-MM-dd';
  static readonly MOMENT_ISO_DATE_FMT = 'YYYY-MM-DD';
  static readonly MOMENT_DATE_FMT = 'DD/MM/YYYY';
  static readonly YEAR_DATE_FMT = 'dd MMM';
  static readonly DATE_TIME_FMT = `${Globals.DATE_FMT} ${Globals.TIME_FMT}`;

  constructor() { }

  random(start: number, end: number) {
    return Math.floor(Math.random() * end) + start;
  }

  // Function to mark invalid form fields based on JSON error
  markInvalidFormFields(form: FormGroup, error: any) {
    if (error._body != null && error._body != '') {
      let body = JSON.parse(error._body);
      for (let key in body.fields) {
        if (form.get(key) != undefined) {
          form?.get(key)?.setErrors({ incorrect: true });
        }
      }
    }
  }

  getFormValidationErrors(form: FormGroup) {
    Object.keys(form.controls).forEach((key) => {
      const controlErrors = form?.get(key)?.errors;
      if (controlErrors != null) {
        Object.keys(controlErrors).forEach((keyError) => {
          console.log(
            'Key control: ' + key + ', keyError: ' + keyError + ', err value: ',
            controlErrors[keyError]
          );
        });
      }
    });
  }

  // Avoid white spaces/empty spaces validator
  noWhitespaceValidator(control: FormControl) {
    if (control.value == null || control.value == '') {
      return null;
    }

    const isWhitespace =
      (JSON.stringify(control.value) || '').trim().length === 0;
    const isValid = !isWhitespace;
    return isValid ? null : { whitespace: true };
  }

  // Equality validator
  equalValueValidator(targetKey: string, toMatchKey: string) {
    return (group: FormGroup): { [key: string]: any } | any => {
      const target = group.controls[targetKey];
      const toMatch = group.controls[toMatchKey];
      if (target.touched && toMatch.touched) {
        const isMatch = target.value === toMatch.value;
        // set equal value error on dirty controls
        if (!isMatch && target.valid && toMatch.valid) {
          toMatch.setErrors({ equalValue: targetKey });
          const message = targetKey + ' != ' + toMatchKey;
          return { equalValue: message };
        }
        if (isMatch && toMatch.hasError('equalValue')) {
          toMatch.setErrors(null);
        }
      }

      return null;
    };
  }

  // Lexicography compare between two properties
  compare(a: any, b: any, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  // Convert seconds to indicative time
  secondsToTime(seconds: any) {
    if (seconds <= 0) {
      return '';
    }

    let days = Math.floor(seconds / (3600 * 24));
    seconds -= days * 3600 * 24;
    let hrs = Math.floor(seconds / 3600);
    seconds -= hrs * 3600;
    let mnts = Math.floor(seconds / 60);
    seconds -= mnts * 60;

    let time = '';
    if (days > 0) {
      time += days.toFixed(0) + 'd ';
    }
    if (hrs > 0) {
      time += hrs.toFixed(0) + 'hrs ';
    }
    if (mnts > 0) {
      time += mnts.toFixed(0) + 'min';
    }

    return time;
  }

  // Return if two dates are in the same day
  isTheSameDay(d1: Date, d2: Date) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  randomAlphaNumeric(length: any) {
    let randomstring = '';
    const chars =
      '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz';
    for (let i = 0; i < length; i++) {
      const rnum = Math.floor(Math.random() * chars.length);
      randomstring += chars.substring(rnum, rnum + 1);
    }

    return randomstring;
  }
}
