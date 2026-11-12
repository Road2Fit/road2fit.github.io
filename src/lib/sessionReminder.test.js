import { describe, it, expect } from 'vitest';
import { calendarFile } from './sessionReminder';

describe('rappel de séance : fichier d’agenda', () => {
  it('une entrée par séance, avec une alarme 30 min avant', () => {
    const ics = calendarFile([{ iso: '2026-11-12', start: '18:00', minutes: 60, title: 'Haut du corps' }, { iso: '2026-11-14', minutes: 45 }], new Date(Date.UTC(2026, 10, 11, 9, 5)));
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics).toContain('DTSTART:20261112T180000');
    expect(ics).toContain('DTEND:20261112T190000');
    expect(ics).toContain('SUMMARY:Haut du corps');
    expect(ics).toContain('DTSTART:20261114T180000');
    expect(ics).toContain('DTEND:20261114T184500');
    expect((ics.match(/BEGIN:VALARM/g) || []).length).toBe(2);
    expect(ics).toContain('TRIGGER:-PT30M');
    expect(ics).toContain('DTSTAMP:20261111T090500Z');
  });
});
