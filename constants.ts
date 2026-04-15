import { ShiftDefinition } from './types';

// Glossário de Siglas para a Tela de Regras
export const LEGEND_GLOSSARY: Record<string, string> = {
    'M': 'Manhã (Turno Matutino)',
    'T': 'Tarde (Turno Vespertino)',
    'N': 'Noite (Turno Noturno)',
    'A/AM/AT/AN': 'Ambulatório (Manhã/Tarde/Noite)',
    'C/CM/CT/CN': 'Centro Cirúrgico (Manhã/Tarde/Noite)',
    'E/EM/ET/EN': 'Enfermaria (Manhã/Tarde/Noite)',
    'P/PM/PT/PN': 'Pronto Socorro (Manhã/Tarde/Noite)',
    'S/SM/ST/SN': 'Serviço/Plantão Geral',
    'AF': 'Afastamento (Genérico)',
    'LM': 'Licença Médica',
    'FE': 'Férias',
    'FR': 'Feriado',
    'FF': 'Folga Compensatória de Feriado',
    'CE': 'Cedido (Servidor cedido a outro órgão)',
    'LP': 'Licença Prêmio',
    'PL': 'Plantão Extra'
};

// Mapeamento COMPLETO conforme Anexo I - Portaria
// Categorias mapeadas para cores: Manhã, Tarde, Noite, Afastamento

export const SHIFT_DEFINITIONS: Record<string, ShiftDefinition> = {
    // ==========================================
    // 1. ADMINISTRATIVO (GENÉRICO)
    // ==========================================
    // 3 Horas
    'M3**':   { code: 'M3**', label: 'M3**', start: '07:00', end: '10:00', hours: 3, category: 'Manhã' },
    'M3***':  { code: 'M3***', label: 'M3***', start: '08:00', end: '11:00', hours: 3, category: 'Manhã' },
    'M3':     { code: 'M3', label: 'M3', start: '09:00', end: '12:00', hours: 3, category: 'Manhã' },
    'M3*':    { code: 'M3*', label: 'M3*', start: '10:00', end: '13:00', hours: 3, category: 'Manhã' },
    'M3****': { code: 'M3****', label: 'M3****', start: '11:00', end: '14:00', hours: 3, category: 'Manhã' },
    'T3':     { code: 'T3', label: 'T3', start: '12:00', end: '15:00', hours: 3, category: 'Tarde' },
    'T3*':    { code: 'T3*', label: 'T3*', start: '13:00', end: '16:00', hours: 3, category: 'Tarde' },
    'T3**':   { code: 'T3**', label: 'T3**', start: '14:00', end: '17:00', hours: 3, category: 'Tarde' },
    'T3***':  { code: 'T3***', label: 'T3***', start: '15:00', end: '18:00', hours: 3, category: 'Tarde' },
    'T3****': { code: 'T3****', label: 'T3****', start: '16:00', end: '19:00', hours: 3, category: 'Tarde' },
    'T3*****':{ code: 'T3*****', label: 'T3*****', start: '17:00', end: '20:00', hours: 3, category: 'Tarde' },
    'N3':     { code: 'N3', label: 'N3', start: '18:00', end: '21:00', hours: 3, category: 'Noite' },
    'N3*':    { code: 'N3*', label: 'N3*', start: '19:00', end: '22:00', hours: 3, category: 'Noite' },

    // 4 Horas
    'M4*':    { code: 'M4*', label: 'M4*', start: '07:00', end: '11:00', hours: 4, category: 'Manhã' },
    'M4':     { code: 'M4', label: 'M4', start: '08:00', end: '12:00', hours: 4, category: 'Manhã' },
    'M4**':   { code: 'M4**', label: 'M4**', start: '09:00', end: '13:00', hours: 4, category: 'Manhã' },
    'M4***':  { code: 'M4***', label: 'M4***', start: '10:00', end: '14:00', hours: 4, category: 'Manhã' },
    'M4****': { code: 'M4****', label: 'M4****', start: '11:00', end: '15:00', hours: 4, category: 'Manhã' },
    'T4**':   { code: 'T4**', label: 'T4**', start: '12:00', end: '16:00', hours: 4, category: 'Tarde' },
    'T4*':    { code: 'T4*', label: 'T4*', start: '13:00', end: '17:00', hours: 4, category: 'Tarde' },
    'T4':     { code: 'T4', label: 'T4', start: '14:00', end: '18:00', hours: 4, category: 'Tarde' },
    'T4***':  { code: 'T4***', label: 'T4***', start: '15:00', end: '19:00', hours: 4, category: 'Tarde' },
    'T4****': { code: 'T4****', label: 'T4****', start: '16:00', end: '20:00', hours: 4, category: 'Tarde' },
    'T4*****':{ code: 'T4*****', label: 'T4*****', start: '17:00', end: '21:00', hours: 4, category: 'Tarde' },
    'N4':     { code: 'N4', label: 'N4', start: '18:00', end: '22:00', hours: 4, category: 'Noite' },

    // 5 Horas
    'M5':     { code: 'M5', label: 'M5', start: '07:00', end: '12:00', hours: 5, category: 'Manhã' },
    'M5*':    { code: 'M5*', label: 'M5*', start: '08:00', end: '13:00', hours: 5, category: 'Manhã' },
    'M5**':   { code: 'M5**', label: 'M5**', start: '09:00', end: '14:00', hours: 5, category: 'Manhã' },
    'M5***':  { code: 'M5***', label: 'M5***', start: '10:00', end: '15:00', hours: 5, category: 'Manhã' },
    'M5****': { code: 'M5****', label: 'M5****', start: '11:00', end: '16:00', hours: 5, category: 'Manhã' },
    'T5**':   { code: 'T5**', label: 'T5**', start: '12:00', end: '17:00', hours: 5, category: 'Tarde' },
    'T5':     { code: 'T5', label: 'T5', start: '13:00', end: '18:00', hours: 5, category: 'Tarde' },
    'T5*':    { code: 'T5*', label: 'T5*', start: '14:00', end: '19:00', hours: 5, category: 'Tarde' },
    'T5****': { code: 'T5****', label: 'T5****', start: '15:00', end: '20:00', hours: 5, category: 'Tarde' },
    'T5*****':{ code: 'T5*****', label: 'T5*****', start: '16:00', end: '21:00', hours: 5, category: 'Tarde' },
    'T5******':{ code: 'T5******', label: 'T5******', start: '17:00', end: '22:00', hours: 5, category: 'Tarde' },

    // 6 Horas
    'M6':     { code: 'M6', label: 'M6', start: '07:00', end: '13:00', hours: 6, category: 'Manhã' },
    'M6*':    { code: 'M6*', label: 'M6*', start: '08:00', end: '14:00', hours: 6, category: 'Manhã' },
    'M6**':   { code: 'M6**', label: 'M6**', start: '09:00', end: '15:00', hours: 6, category: 'Manhã' },
    'M6***':  { code: 'M6***', label: 'M6***', start: '10:00', end: '16:00', hours: 6, category: 'Manhã' },
    'M6****': { code: 'M6****', label: 'M6****', start: '11:00', end: '17:00', hours: 6, category: 'Manhã' },
    'T6*':    { code: 'T6*', label: 'T6*', start: '12:00', end: '18:00', hours: 6, category: 'Tarde' },
    'T6':     { code: 'T6', label: 'T6', start: '13:00', end: '19:00', hours: 6, category: 'Tarde' },
    'T6***':  { code: 'T6***', label: 'T6***', start: '14:00', end: '20:00', hours: 6, category: 'Tarde' },
    'T6****': { code: 'T6****', label: 'T6****', start: '15:00', end: '21:00', hours: 6, category: 'Tarde' },
    'T6*****':{ code: 'T6*****', label: 'T6*****', start: '16:00', end: '22:00', hours: 6, category: 'Tarde' },

    // 7 Horas
    'M7':     { code: 'M7', label: 'M7', start: '07:00', end: '14:00', hours: 7, category: 'Manhã' },
    'M7*':    { code: 'M7*', label: 'M7*', start: '08:00', end: '15:00', hours: 7, category: 'Manhã' },
    'M7**':   { code: 'M7**', label: 'M7**', start: '09:00', end: '16:00', hours: 7, category: 'Manhã' },
    'M7***':  { code: 'M7***', label: 'M7***', start: '10:00', end: '17:00', hours: 7, category: 'Manhã' },
    'M7****': { code: 'M7****', label: 'M7****', start: '11:00', end: '18:00', hours: 7, category: 'Manhã' },
    'T7':     { code: 'T7', label: 'T7', start: '12:00', end: '19:00', hours: 7, category: 'Tarde' },
    'T7*':    { code: 'T7*', label: 'T7*', start: '13:00', end: '20:00', hours: 7, category: 'Tarde' },
    'T7**':   { code: 'T7**', label: 'T7**', start: '14:00', end: '21:00', hours: 7, category: 'Tarde' },
    'T7***':  { code: 'T7***', label: 'T7***', start: '15:00', end: '22:00', hours: 7, category: 'Tarde' },

    // ==========================================
    // 2. AMBULATÓRIO (A)
    // ==========================================
    'AM3**':  { code: 'AM3**', label: 'AM3**', start: '07:00', end: '10:00', hours: 3, category: 'Manhã' },
    'AM3***': { code: 'AM3***', label: 'AM3***', start: '08:00', end: '11:00', hours: 3, category: 'Manhã' },
    'AM3':    { code: 'AM3', label: 'AM3', start: '09:00', end: '12:00', hours: 3, category: 'Manhã' },
    'AM3*':   { code: 'AM3*', label: 'AM3*', start: '10:00', end: '13:00', hours: 3, category: 'Manhã' },
    'AM3****':{ code: 'AM3****', label: 'AM3****', start: '11:00', end: '14:00', hours: 3, category: 'Manhã' },
    'AT3':    { code: 'AT3', label: 'AT3', start: '12:00', end: '15:00', hours: 3, category: 'Tarde' },
    'AT3*':   { code: 'AT3*', label: 'AT3*', start: '13:00', end: '16:00', hours: 3, category: 'Tarde' },
    'AT3**':  { code: 'AT3**', label: 'AT3**', start: '14:00', end: '17:00', hours: 3, category: 'Tarde' },
    'AT3***': { code: 'AT3***', label: 'AT3***', start: '15:00', end: '18:00', hours: 3, category: 'Tarde' },
    'AT3****':{ code: 'AT3****', label: 'AT3****', start: '16:00', end: '19:00', hours: 3, category: 'Tarde' },
    'AT3*****':{ code: 'AT3*****', label: 'AT3*****', start: '17:00', end: '20:00', hours: 3, category: 'Tarde' },
    'AN3':    { code: 'AN3', label: 'AN3', start: '18:00', end: '21:00', hours: 3, category: 'Noite' },
    'AN3*':   { code: 'AN3*', label: 'AN3*', start: '19:00', end: '22:00', hours: 3, category: 'Noite' },
    
    // Ambulatório 4h
    'AM4*':   { code: 'AM4*', label: 'AM4*', start: '07:00', end: '11:00', hours: 4, category: 'Manhã' },
    'AM4':    { code: 'AM4', label: 'AM4', start: '08:00', end: '12:00', hours: 4, category: 'Manhã' },
    'AM4**':  { code: 'AM4**', label: 'AM4**', start: '09:00', end: '13:00', hours: 4, category: 'Manhã' },
    'AM4***': { code: 'AM4***', label: 'AM4***', start: '10:00', end: '14:00', hours: 4, category: 'Manhã' },
    'AM4****':{ code: 'AM4****', label: 'AM4****', start: '11:00', end: '15:00', hours: 4, category: 'Manhã' },
    'AT4**':  { code: 'AT4**', label: 'AT4**', start: '12:00', end: '16:00', hours: 4, category: 'Tarde' },
    'AT4*':   { code: 'AT4*', label: 'AT4*', start: '13:00', end: '17:00', hours: 4, category: 'Tarde' },
    'AT4':    { code: 'AT4', label: 'AT4', start: '14:00', end: '18:00', hours: 4, category: 'Tarde' },
    'AT4***': { code: 'AT4***', label: 'AT4***', start: '15:00', end: '19:00', hours: 4, category: 'Tarde' },
    'AT4****':{ code: 'AT4****', label: 'AT4****', start: '16:00', end: '20:00', hours: 4, category: 'Tarde' },
    'AT4*****':{ code: 'AT4*****', label: 'AT4*****', start: '17:00', end: '21:00', hours: 4, category: 'Tarde' },
    'AN4':    { code: 'AN4', label: 'AN4', start: '18:00', end: '22:00', hours: 4, category: 'Noite' },
    'AN4*':   { code: 'AN4*', label: 'AN4*', start: '19:00', end: '23:00', hours: 4, category: 'Noite' },

    // Ambulatório 5-7h (Amostra principais)
    'AM6':    { code: 'AM6', label: 'AM6', start: '07:00', end: '13:00', hours: 6, category: 'Manhã' },
    'AT6':    { code: 'AT6', label: 'AT6', start: '13:00', end: '19:00', hours: 6, category: 'Tarde' },

    // ==========================================
    // 3. CENTRO CIRÚRGICO (C)
    // ==========================================
    'CM6':    { code: 'CM6', label: 'CM6', start: '07:00', end: '13:00', hours: 6, category: 'Manhã' },
    'CT6':    { code: 'CT6', label: 'CT6', start: '13:00', end: '19:00', hours: 6, category: 'Tarde' },
    'CN6':    { code: 'CN6', label: 'CN6', start: '19:00', end: '01:00', hours: 6, category: 'Noite' },
    'CN12':   { code: 'CN12', label: 'CN12', start: '19:00', end: '07:00', hours: 12, category: 'Noite' },
    // Adicionando algumas variações 4/5h comuns
    'CM4':    { code: 'CM4', label: 'CM4', start: '08:00', end: '12:00', hours: 4, category: 'Manhã' },
    'CT4':    { code: 'CT4', label: 'CT4', start: '14:00', end: '18:00', hours: 4, category: 'Tarde' },

    // ==========================================
    // 4. ENFERMARIA (E)
    // ==========================================
    'EM6':    { code: 'EM6', label: 'EM6', start: '07:00', end: '13:00', hours: 6, category: 'Manhã' },
    'ET6':    { code: 'ET6', label: 'ET6', start: '13:00', end: '19:00', hours: 6, category: 'Tarde' },
    'EN6':    { code: 'EN6', label: 'EN6', start: '19:00', end: '01:00', hours: 6, category: 'Noite' },
    'EN12':   { code: 'EN12', label: 'EN12', start: '19:00', end: '07:00', hours: 12, category: 'Noite' },

    // ==========================================
    // 5. PRONTO SOCORRO (P)
    // ==========================================
    'PM6':    { code: 'PM6', label: 'PM6', start: '07:00', end: '13:00', hours: 6, category: 'Manhã' },
    'PT6':    { code: 'PT6', label: 'PT6', start: '13:00', end: '19:00', hours: 6, category: 'Tarde' },
    'PN6':    { code: 'PN6', label: 'PN6', start: '19:00', end: '01:00', hours: 6, category: 'Noite' },
    'PN12':   { code: 'PN12', label: 'PN12', start: '19:00', end: '07:00', hours: 12, category: 'Noite' },
    
    // ==========================================
    // 6. SERVIÇO (S)
    // ==========================================
    'SM6':    { code: 'SM6', label: 'SM6', start: '07:00', end: '13:00', hours: 6, category: 'Manhã' },
    'ST6':    { code: 'ST6', label: 'ST6', start: '13:00', end: '19:00', hours: 6, category: 'Tarde' },
    'SN6':    { code: 'SN6', label: 'SN6', start: '19:00', end: '01:00', hours: 6, category: 'Noite' },
    'SN12':   { code: 'SN12', label: 'SN12', start: '19:00', end: '07:00', hours: 12, category: 'Noite' },

    // ==========================================
    // 7. AFASTAMENTOS E LICENÇAS
    // ==========================================
    // Afastamento (AF)
    'AF4':    { code: 'AF4', label: 'AF4 (Afast.)', start: '08:00', end: '12:00', hours: 4, category: 'Afastamento' },
    'AF6':    { code: 'AF6', label: 'AF6 (Afast.)', start: '07:00', end: '13:00', hours: 6, category: 'Afastamento' },
    'AF12':   { code: 'AF12', label: 'AF12 (Afast.)', start: '19:00', end: '07:00', hours: 12, category: 'Afastamento' },
    
    // Férias (FE)
    'FE6':    { code: 'FE6', label: 'FE6 (Férias)', start: '07:00', end: '13:00', hours: 6, category: 'Afastamento' },
    'FE12':   { code: 'FE12', label: 'FE12 (Férias)', start: '19:00', end: '07:00', hours: 12, category: 'Afastamento' },
    
    // Feriado (FR)
    'FR6':    { code: 'FR6', label: 'FR6 (Feriado)', start: '07:00', end: '13:00', hours: 6, category: 'Afastamento' },
    'FR12':   { code: 'FR12', label: 'FR12 (Feriado)', start: '19:00', end: '07:00', hours: 12, category: 'Afastamento' },
    
    // Folga Compensatória (FF)
    'FF6':    { code: 'FF6', label: 'FF6 (Folga)', start: '07:00', end: '13:00', hours: 6, category: 'Afastamento' },
    
    // Cedido (CE)
    'CE6':    { code: 'CE6', label: 'CE6 (Cedido)', start: '07:00', end: '13:00', hours: 6, category: 'Afastamento' },
    
    // Licença Médica (LM)
    'LM6':    { code: 'LM6', label: 'LM6 (Médica)', start: '07:00', end: '13:00', hours: 6, category: 'Afastamento' },
    'LM12':   { code: 'LM12', label: 'LM12 (Médica)', start: '19:00', end: '07:00', hours: 12, category: 'Afastamento' },

    // Licença Prêmio (LP)
    'LP6':    { code: 'LP6', label: 'LP6 (Prêmio)', start: '07:00', end: '13:00', hours: 6, category: 'Afastamento' },
};

export const AVATAR_COLORS = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500',
    'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
    'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
    'bg-pink-500', 'bg-rose-500'
];