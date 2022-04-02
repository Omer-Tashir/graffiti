import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'enum'
})
export class EnumToStringPipe implements PipeTransform {
    transform(value: number, enumType: any): any {
        return enumType[value]?.split(/(?=[A-Z])/).join().replace(",", " ") ?? value;
    }
}