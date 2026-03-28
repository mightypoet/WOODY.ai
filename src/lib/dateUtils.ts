import { format, isValid, parseISO } from 'date-fns';

export function safeFormat(date: any, formatStr: string = 'MMM d, yyyy'): string {
  if (!date) return 'N/A';
  
  let dateObj: Date;
  
  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string') {
    dateObj = parseISO(date);
    if (!isValid(dateObj)) {
      dateObj = new Date(date);
    }
  } else if (typeof date === 'number') {
    dateObj = new Date(date);
  } else {
    return 'Invalid Date';
  }

  if (!isValid(dateObj)) {
    return 'Invalid Date';
  }

  return format(dateObj, formatStr);
}
