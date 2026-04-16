/* ============================================
   KINDpos Overseer — Shift Config Data
   Constants and helpers for shift management UI.
   Schedule data built from employee roster.
   ============================================ */

import { EMPLOYEES } from './sample-employees.js';

export const SHIFT_STATUSES = {
    scheduled:  { label: 'Scheduled',  color: 'var(--color-mint)'        },
    active:     { label: 'Active',     color: 'var(--color-green)'       },
    completed:  { label: 'Completed',  color: 'rgba(var(--color-mint-rgb), 0.4)' },
    missed:     { label: 'No Show',    color: 'var(--color-vermillion)'  },
    swapped:    { label: 'Swapped',    color: 'var(--color-gold)'        },
};

export const SWAP_STATUSES = {
    pending:  { label: 'Pending',  color: 'var(--color-gold)'        },
    approved: { label: 'Approved', color: 'var(--color-green)'       },
    denied:   { label: 'Denied',   color: 'var(--color-vermillion)'  },
};

export const GANTT_CONFIG = {
    startHour: 6,
    endHour: 24,
    hourWidth: 60,
    rowHeight: 40,
};

export const SHIFT_TEMPLATES = [
    { id: 'open',  label: 'Open',  start: '10:00', end: '16:00' },
    { id: 'mid',   label: 'Mid',   start: '12:00', end: '20:00' },
    { id: 'close', label: 'Close', start: '16:00', end: '23:00' },
    { id: 'full',  label: 'Full',  start: '10:00', end: '23:00' },
];

export let TODAYS_SCHEDULE = [];
export let SWAP_REQUESTS = [];

export const COVERAGE_REQUIREMENTS = [
    { daypart: 'Lunch (11a–2p)',  minStaff: 3 },
    { daypart: 'Dinner (5p–9p)',  minStaff: 4 },
    { daypart: 'Late (9p–Close)', minStaff: 2 },
];

export function timeToPercent(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = (h - GANTT_CONFIG.startHour) * 60 + m;
    const totalRange = (GANTT_CONFIG.endHour - GANTT_CONFIG.startHour) * 60;
    return (totalMinutes / totalRange) * 100;
}

export function barWidth(start, end) {
    return timeToPercent(end) - timeToPercent(start);
}

export async function loadShiftData() {
    TODAYS_SCHEDULE = EMPLOYEES
        .filter(e => e.status === 'active')
        .map((emp, i) => {
            const template = SHIFT_TEMPLATES[i % SHIFT_TEMPLATES.length];
            return {
                employeeId: emp.id,
                name: `${emp.firstName} ${emp.lastName}`,
                role: emp.role,
                start: template.start,
                end: template.end,
                status: 'scheduled',
                template: template.id,
            };
        });
    SWAP_REQUESTS = [];
}
