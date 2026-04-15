export type ShiftCode = string;

export interface ShiftDefinition {
    code: ShiftCode;
    label: string;
    start: string;
    end: string;
    hours: number;
    category: 'Manhã' | 'Tarde' | 'Noite' | 'Madrugada' | 'Afastamento' | 'Bloqueio' | 'Legenda Especial';
}

export interface EmployeePreferences {
    reducaoCarga: number; // Horas a reduzir da contratual
    periodoPreferencial: 'INDIFERENTE' | 'DIURNO' | 'NOTURNO';
    prefersWeekends: boolean; // Para servidores de outro estado
    tipoAtuacao: 'TOTAL' | 'ADMINISTRATIVO' | 'RESTRICAO_ASSISTENCIA';
    // diasProibidos removido, agora é gerido dinamicamente na escala
}

export interface Employee {
    id: string;
    name: string;
    matricula: string;
    coren: string;
    role: string;
    contractHours: number;
    unit: string;
    sector: string; 
    cnes: string;
    contact: string;
    restrictions?: string;
    colorIdentifier: string;
    
    preferences: EmployeePreferences;
}

export interface ShiftAssignment {
    id: string;
    employeeId: string;
    date: string; // ISO Date string YYYY-MM-DD
    shiftCode: ShiftCode;
    duration: number; // in hours, denormalized for performance
    isManualLock?: boolean; // Se foi bloqueado manualmente pelo gestor naquele mês
}

export interface WeekData {
    startDate: string;
    assignments: ShiftAssignment[];
}

export interface UnitStructure {
    id: string;
    name: string;
    sectors: string[];
}