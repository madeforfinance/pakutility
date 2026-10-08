/* Vehicle module shared types. Vehicle expenses live in the shared
   `transactions` store (source='vehicle:fuel') per the integration rule —
   no separate expense database. */

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  type: string; // Car, Bike, Van, Truck, Other
  mileage: number; // km per litre
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  kind: 'Oil change' | 'Tyres' | 'General' | 'Insurance' | 'Other';
  date: string; // YYYY-MM-DD
  odometer: number;
  cost: number;
  note: string;
  nextDue: string; // YYYY-MM-DD or ''
  nextOdometer: number; // 0 = not set
}

/** Vehicle-specific fields attached to a transaction record (source='vehicle:fuel'). */
export interface VehicleExpenseExtra {
  vehicleId?: string;
  expenseKind?: string; // Fuel | Service | Repair | Insurance | Other
  odometer?: number;
}

export const EXPENSE_KINDS = ['Fuel', 'Service', 'Repair', 'Insurance', 'Other'] as const;

export const VEHICLE_TYPES = ['Car', 'Bike', 'Van', 'Truck', 'Other'] as const;

export const MAINT_KINDS: MaintenanceRecord['kind'][] = [
  'Oil change',
  'Tyres',
  'General',
  'Insurance',
  'Other',
];

/** Current odometer estimate for a vehicle = max recorded odometer across
    maintenance + vehicle expenses. 0 when nothing recorded yet. */
export function currentOdometer(
  vehicleId: string,
  maintenance: MaintenanceRecord[],
  txns: { vehicleId?: string; odometer?: number; source?: string }[],
): number {
  let max = 0;
  for (const m of maintenance) {
    if (m.vehicleId === vehicleId && m.odometer > max) max = m.odometer;
  }
  for (const t of txns) {
    if (t.source === 'vehicle:fuel' && t.vehicleId === vehicleId && (t.odometer || 0) > max) {
      max = t.odometer || 0;
    }
  }
  return max;
}
