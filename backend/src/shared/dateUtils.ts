// Date utility functions

export function getDateWindow(startDate: Date, days: number): { start: Date; end: Date } {
  const end = new Date(startDate);
  end.setDate(end.getDate() + days);
  return {
    start: startDate,
    end,
  };
}

export function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

