import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Employee, ShiftAssignment, ShiftDefinition } from '../types';
import { RulesService } from '../services/rulesService';
import { Search, Calendar, ChevronLeft, ChevronRight, Ban, Trash2, Lock, X, MessageSquare, TrendingUp, Sparkles } from 'lucide-react';

interface ScaleGridProps {
    employees: Employee[];
    assignments: ShiftAssignment[];
    onAssignmentChange: (newAssignments: ShiftAssignment[]) => void;
    onAssignmentDelete: (id: string) => Promise<void>;
    startDate: Date; 
    shiftDefs: Record<string, ShiftDefinition>;
    canEdit?: boolean;
}

interface ActiveCell {
    empId: string;
    dateStr: string;
    empName: string;
}

interface WeekSegment {
    start: Date;
    end: Date;
    colSpan: number;
    fullWeekStart: Date;
    fullWeekEnd: Date;
}

const NOTES_KEY = 'sis_escala_weekly_notes';
const USAGE_KEY = 'sis_escala_shift_usage';

const ScaleGrid: React.FC<ScaleGridProps> = ({ employees, assignments, onAssignmentChange, onAssignmentDelete, startDate, shiftDefs, canEdit = false }) => {
    const [currentDate, setCurrentDate] = useState(startDate);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
    const [shiftSearch, setShiftSearch] = useState('');
    const [weeklyNotes, setWeeklyNotes] = useState<Record<string, string>>({});
    const [usageStats, setUsageStats] = useState<Record<string, number>>({});
    
    // Batch Event State
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchForm, setBatchForm] = useState({
        employeeId: '',
        startDate: '',
        endDate: '',
        shiftCode: ''
    });
    
    // Month and Year Filters
    const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return [currentYear - 1, currentYear, currentYear + 1];
    }, []);

    // Update currentDate when selectors change
    useEffect(() => {
        setCurrentDate(new Date(selectedYear, selectedMonth, 1));
    }, [selectedMonth, selectedYear]);

    const searchInputRef = useRef<HTMLInputElement>(null);

    // Load Notes and Usage Stats on Mount
    useEffect(() => {
        const savedNotes = localStorage.getItem(NOTES_KEY);
        if (savedNotes) setWeeklyNotes(JSON.parse(savedNotes));

        const savedUsage = localStorage.getItem(USAGE_KEY);
        if (savedUsage) setUsageStats(JSON.parse(savedUsage));
    }, []);

    const saveNote = (key: string, value: string) => {
        const updated = { ...weeklyNotes, [key]: value };
        setWeeklyNotes(updated);
        localStorage.setItem(NOTES_KEY, JSON.stringify(updated));
    };

    const incrementUsage = (code: string) => {
        const newStats = { ...usageStats, [code]: (usageStats[code] || 0) + 1 };
        setUsageStats(newStats);
        localStorage.setItem(USAGE_KEY, JSON.stringify(newStats));
    };

    // Focus input when modal opens
    useEffect(() => {
        if (activeCell && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [activeCell]);

    // Generate days
    const daysInMonth = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const date = new Date(year, month, 1);
        const days = [];
        while (date.getMonth() === month) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    }, [currentDate]);

    // Calculate Week Segments
    const weekSegments = useMemo(() => {
        const segments: WeekSegment[] = [];
        if (daysInMonth.length === 0) return segments;

        let currentSegmentStart = daysInMonth[0];
        let count = 0;

        daysInMonth.forEach((day, index) => {
            const isSunday = day.getDay() === 0;
            const isFirstDay = index === 0;
            
            if (isSunday && !isFirstDay) {
                const prevEnd = new Date(daysInMonth[index - 1]);
                const { start: fullStart, end: fullEnd } = RulesService.getWeekRange(prevEnd);
                
                segments.push({
                    start: currentSegmentStart,
                    end: prevEnd,
                    colSpan: count,
                    fullWeekStart: fullStart,
                    fullWeekEnd: fullEnd
                });

                currentSegmentStart = day;
                count = 0;
            }
            count++;

            if (index === daysInMonth.length - 1) {
                const { start: fullStart, end: fullEnd } = RulesService.getWeekRange(day);
                segments.push({
                    start: currentSegmentStart,
                    end: day,
                    colSpan: count,
                    fullWeekStart: fullStart,
                    fullWeekEnd: fullEnd
                });
            }
        });
        return segments;
    }, [daysInMonth]);

    const nextMonth = () => {
        const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        setSelectedMonth(nextDate.getMonth());
        setSelectedYear(nextDate.getFullYear());
    };
    const prevMonth = () => {
        const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        setSelectedMonth(prevDate.getMonth());
        setSelectedYear(prevDate.getFullYear());
    };

    const filteredEmployees = employees.filter(emp => {
        const matchName = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchRole = emp.role.toLowerCase().includes(searchTerm.toLowerCase());
        return matchName || matchRole;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // --- Helpers ---
    const getCellAssignments = (empId: string, dateStr: string) => {
        return assignments.filter(a => a.employeeId === empId && a.date === dateStr);
    };

    // --- Actions ---
    const handleCellClick = (empId: string, dateStr: string, empName: string) => {
        if (!canEdit) return;
        setActiveCell({ empId, dateStr, empName });
        setShiftSearch('');
    };

    const handleAddShift = (code: string) => {
        if (!activeCell) return;
        const { empId, dateStr } = activeCell;

        incrementUsage(code); // Track usage

        let updatedAssignments = [...assignments];

        if (code === 'BLK') {
            updatedAssignments = updatedAssignments.filter(a => !(a.employeeId === empId && a.date === dateStr));
            const lockAssignment = RulesService.createAssignment(empId, dateStr, { 
                code: 'BLK', label: 'Bloqueio', start: '', end: '', hours: 0, category: 'Bloqueio' 
            }, true);
            updatedAssignments.push(lockAssignment);
        } else {
            updatedAssignments = updatedAssignments.filter(a => 
                !(a.employeeId === empId && a.date === dateStr && (a.isManualLock || a.shiftCode === code))
            );
            const def = shiftDefs[code];
            if (def) {
                const newAssignment = RulesService.createAssignment(empId, dateStr, def);
                updatedAssignments.push(newAssignment);
            }
        }

        onAssignmentChange(updatedAssignments);
        if (code === 'BLK') setActiveCell(null);
    };

    const handleRemoveAssignment = async (assignmentId: string) => {
        await onAssignmentDelete(assignmentId);
    };

    const handleClearDay = async (empId: string, dateStr: string) => {
        const toDelete = assignments.filter(a => a.employeeId === empId && a.date === dateStr);
        if (toDelete.length > 0) {
            await Promise.all(toDelete.map(a => onAssignmentDelete(a.id)));
        }
    };

    // --- Smart Lists Logic ---
    const topUsedShifts = useMemo(() => {
        return Object.keys(usageStats)
            .sort((a, b) => usageStats[b] - usageStats[a])
            .slice(0, 5) // Top 5
            .map(code => shiftDefs[code])
            .filter(Boolean);
    }, [usageStats, shiftDefs]);

    const standardShifts = useMemo(() => {
        return Object.values(shiftDefs).filter((s: ShiftDefinition) => s && s.code && s.code.startsWith('S')); // 'S' codes (SM6, SN12...)
    }, [shiftDefs]);

    const specialShifts = useMemo(() => {
        return Object.values(shiftDefs).filter((s: ShiftDefinition) => s && s.category === 'Legenda Especial');
    }, [shiftDefs]);

    const bankShifts = useMemo(() => {
        return Object.values(shiftDefs).filter((s: ShiftDefinition) => s && s.category === 'Banco de Horas');
    }, [shiftDefs]);

    const filteredShifts = useMemo(() => {
        const all = Object.values(shiftDefs);
        const term = shiftSearch.toLowerCase();
        return all.filter((s: ShiftDefinition) => 
            s && s.code && s.label && s.category && (
            s.code.toLowerCase().includes(term) || 
            s.label.toLowerCase().includes(term) ||
            s.category.toLowerCase().includes(term)
            )
        );
    }, [shiftSearch, shiftDefs]);

    const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;
    const isSaturday = (date: Date) => date.getDay() === 6;

    const handleBatchSubmit = () => {
        if (!batchForm.employeeId || !batchForm.startDate || !batchForm.endDate || !batchForm.shiftCode) {
            alert("Preencha todos os campos.");
            return;
        }

        const start = new Date(batchForm.startDate + 'T00:00:00');
        const end = new Date(batchForm.endDate + 'T00:00:00');
        
        if (start > end) {
            alert("A data de início deve ser menor ou igual a data de fim.");
            return;
        }

        const newAssignments = [...assignments];
        const def = shiftDefs[batchForm.shiftCode];

        let current = new Date(start);
        while (current <= end) {
            const y = current.getFullYear();
            const m = String(current.getMonth() + 1).padStart(2, '0');
            const d = String(current.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;

            // Check if already has assignment on this day (optional, we can just add)
            const existing = newAssignments.find(a => a.employeeId === batchForm.employeeId && a.date === dateStr && a.shiftCode === batchForm.shiftCode);
            if (!existing) {
                newAssignments.push(RulesService.createAssignment(batchForm.employeeId, dateStr, def, false));
            }

            current.setDate(current.getDate() + 1);
        }

        onAssignmentChange(newAssignments);
        setShowBatchModal(false);
        setBatchForm({ employeeId: '', startDate: '', endDate: '', shiftCode: '' });
    };

    // Helper to render assignment list
    const renderShiftButtonList = (shifts: ShiftDefinition[]) => (
        <div className="grid grid-cols-1 gap-1">
            {shifts.map((def: ShiftDefinition) => (
                <button 
                    key={def.code}
                    onClick={() => handleAddShift(def.code)}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 rounded-lg flex justify-between items-center group border-b border-gray-50 last:border-0"
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded flex items-center justify-center text-xs font-bold shadow-sm ${RulesService.getShiftColor(def.category, def.code)}`}>
                            {def.code}
                        </div>
                        <div>
                            <div className="font-bold text-gray-800">{def.label}</div>
                            <div className="text-xs text-gray-500">{def.category} • {def.start} - {def.end}</div>
                        </div>
                    </div>
                    <div className="text-sm font-bold text-gray-400 group-hover:text-blue-600">
                        {def.hours}h
                    </div>
                </button>
            ))}
        </div>
    );

    const renderActiveCellAssignments = () => {
        if (!activeCell) return null;
        const cellAssignments = getCellAssignments(activeCell.empId, activeCell.dateStr);
        if (cellAssignments.length === 0) return null;

        return (
            <div className="p-4 bg-blue-50 border-b border-blue-100">
                <h4 className="text-xs font-bold text-blue-800 uppercase mb-2">Alocações no Dia</h4>
                <div className="flex flex-wrap gap-2">
                    {cellAssignments.map(a => {
                         const def = shiftDefs[a.shiftCode];
                         return (
                            <div key={a.id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-blue-200 shadow-sm">
                                <span className={`text-xs font-bold ${a.isManualLock ? 'text-red-500' : 'text-gray-700'}`}>
                                    {a.isManualLock ? 'BLOQUEIO' : a.shiftCode}
                                </span>
                                {!a.isManualLock && <span className="text-[10px] text-gray-500">({a.duration}h)</span>}
                                <button 
                                    onClick={() => handleRemoveAssignment(a.id)}
                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full p-0.5"
                                >
                                    <X size={14}/>
                                </button>
                            </div>
                         );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full space-y-4 relative">
            
            {/* SHIFT SELECTION MODAL */}
            {activeCell && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setActiveCell(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-800 text-lg">Gerenciar Plantões</h3>
                                <p className="text-sm text-gray-500">
                                    {activeCell.empName} - {new Date(activeCell.dateStr).toLocaleDateString('pt-BR')}
                                </p>
                            </div>
                            <button onClick={() => setActiveCell(null)} className="text-gray-400 hover:text-red-500">
                                <X size={24}/>
                            </button>
                        </div>

                        {renderActiveCellAssignments()}
                        
                        <div className="p-4 border-b">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input 
                                    ref={searchInputRef}
                                    type="text" 
                                    placeholder="Buscar legenda (ex: M3, 12, Noite)..." 
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gdf-primary focus:outline-none text-lg"
                                    value={shiftSearch}
                                    onChange={(e) => setShiftSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1 p-2">
                             
                             {/* DEFAULT VIEW (No Search) */}
                             {shiftSearch === '' && (
                                <div className="space-y-4">
                                    <button 
                                        onClick={() => handleAddShift('BLK')}
                                        className="w-full text-left px-4 py-3 bg-red-50 hover:bg-red-100 rounded-lg flex justify-between items-center group border border-red-100"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white text-red-600 p-2 rounded shadow-sm">
                                                <Ban size={20}/>
                                            </div>
                                            <div>
                                                <div className="font-bold text-red-700">BLOQUEAR DIA</div>
                                                <div className="text-xs text-red-500">Limpar e bloquear data</div>
                                            </div>
                                        </div>
                                    </button>

                                    {topUsedShifts.length > 0 && (
                                        <div>
                                            <h4 className="px-4 text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                                                <TrendingUp size={12}/> Mais Utilizados
                                            </h4>
                                            {renderShiftButtonList(topUsedShifts)}
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="px-4 text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                                            <Sparkles size={12} className="text-gdf-accent"/> Plantão Geral (Padrão)
                                        </h4>
                                        {renderShiftButtonList(standardShifts)}
                                    </div>

                                    {specialShifts.length > 0 && (
                                        <div>
                                            <h4 className="px-4 text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                                                <Sparkles size={12} className="text-pink-500"/> Legendas Especiais
                                            </h4>
                                            {renderShiftButtonList(specialShifts)}
                                        </div>
                                    )}

                                    {bankShifts.length > 0 && (
                                        <div>
                                            <h4 className="px-4 text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                                                <TrendingUp size={12} className="text-orange-500"/> Banco de Horas (BH+ / BH-)
                                            </h4>
                                            {renderShiftButtonList(bankShifts)}
                                        </div>
                                    )}
                                </div>
                             )}

                             {/* SEARCH RESULTS */}
                             {shiftSearch !== '' && (
                                <>
                                    {renderShiftButtonList(filteredShifts)}
                                    {filteredShifts.length === 0 && (
                                        <div className="text-center py-8 text-gray-400">
                                            Nenhuma legenda encontrada.
                                        </div>
                                    )}
                                </>
                             )}
                        </div>
                    </div>
                </div>
            )}

            {/* Batch Event Modal */}
            {showBatchModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowBatchModal(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-800 text-lg">Lançar Evento em Lote</h3>
                                <p className="text-sm text-gray-500">Adicionar férias, licenças, abonos, etc.</p>
                            </div>
                            <button onClick={() => setShowBatchModal(false)} className="text-gray-400 hover:text-red-500">
                                <X size={24}/>
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Servidor</label>
                                <select 
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-gdf-primary focus:border-gdf-primary p-2 border bg-white"
                                    value={batchForm.employeeId}
                                    onChange={e => setBatchForm({...batchForm, employeeId: e.target.value})}
                                >
                                    <option value="">Selecione um servidor...</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Data Início</label>
                                    <input 
                                        type="date" 
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-gdf-primary focus:border-gdf-primary p-2 border bg-white"
                                        value={batchForm.startDate}
                                        onChange={e => setBatchForm({...batchForm, startDate: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Data Fim</label>
                                    <input 
                                        type="date" 
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-gdf-primary focus:border-gdf-primary p-2 border bg-white"
                                        value={batchForm.endDate}
                                        onChange={e => setBatchForm({...batchForm, endDate: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Evento (Afastamento / Especial)</label>
                                <select 
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-gdf-primary focus:border-gdf-primary p-2 border bg-white"
                                    value={batchForm.shiftCode}
                                    onChange={e => setBatchForm({...batchForm, shiftCode: e.target.value})}
                                >
                                    <option value="">Selecione um evento...</option>
                                    {Object.values(shiftDefs)
                                        .filter((def: ShiftDefinition) => def && (def.category === 'Afastamento' || def.category === 'Legenda Especial'))
                                        .map((def: ShiftDefinition) => (
                                            <option key={def.code} value={def.code}>{def.label} ({def.hours}h)</option>
                                        ))
                                    }
                                </select>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowBatchModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition">Cancelar</button>
                            <button onClick={handleBatchSubmit} className="px-4 py-2 bg-gdf-primary text-white hover:bg-blue-700 rounded-lg shadow-sm transition">Aplicar Evento</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header / Controls */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col lg:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button onClick={prevMonth} className="p-2 hover:bg-white rounded-md shadow-sm transition"><ChevronLeft size={20}/></button>
                        <div className="px-4 font-bold text-gray-800 min-w-[150px] text-center flex items-center gap-2 justify-center">
                            <Calendar size={18} className="text-gdf-primary"/>
                            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                        </div>
                        <button onClick={nextMonth} className="p-2 hover:bg-white rounded-md shadow-sm transition"><ChevronRight size={20}/></button>
                    </div>
                    {canEdit && (
                        <button 
                            onClick={() => setShowBatchModal(true)}
                            className="bg-gdf-primary text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 transition text-sm font-semibold whitespace-nowrap"
                        >
                            Lançar Eventos
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <div className="flex-1 lg:w-32">
                        <select 
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-gdf-primary focus:border-gdf-primary text-sm p-2 border bg-white"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        >
                            {months.map((month, index) => (
                                <option key={index} value={index}>{month}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 lg:w-24">
                        <select 
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-gdf-primary focus:border-gdf-primary text-sm p-2 border bg-white"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                        >
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative flex-1 lg:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Buscar servidor..." 
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-gdf-secondary focus:outline-none text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Excel Grid Container */}
            <div className="flex-1 overflow-auto bg-white rounded-lg shadow border border-gray-300 relative">
                <table className="border-collapse w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0 z-30 shadow-sm text-gray-600">
                        <tr>
                            <th className="sticky left-0 bg-gray-100 z-40 border-r border-b border-gray-300 px-4 py-2 text-left min-w-[250px] font-bold text-xs uppercase">
                                Servidor
                            </th>
                            {daysInMonth.map((d, i) => (
                                <th 
                                    key={i} 
                                    className={`border-b border-gray-300 min-w-[36px] px-1 py-2 text-center relative
                                        ${isWeekend(d) ? 'bg-orange-50' : ''}
                                        ${isSaturday(d) ? 'border-r-2 border-r-gray-400' : 'border-r'} 
                                    `}
                                >
                                    <div className="text-[10px] font-bold">{d.toLocaleDateString('pt-BR', { weekday: 'narrow' })}</div>
                                    <div className="text-xs">{d.getDate()}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEmployees.map((emp) => {
                            return (
                                <React.Fragment key={emp.id}>
                                    {/* ROW 1: SHIFT ASSIGNMENTS */}
                                    <tr className="hover:bg-blue-50 transition-colors group">
                                        <td className="sticky left-0 bg-white group-hover:bg-blue-50 z-20 border-r border-gray-200 px-4 py-3 align-middle">
                                            <div className="flex items-center">
                                                <div className={`w-8 h-8 rounded-full ${emp.colorIdentifier} flex items-center justify-center text-white text-xs font-bold mr-3`}>
                                                    {emp.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900 truncate w-40">{emp.name}</div>
                                                    <div className="text-[10px] text-gray-500">{emp.role}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {daysInMonth.map((d, i) => {
                                            const y = d.getFullYear();
                                            const m = String(d.getMonth() + 1).padStart(2, '0');
                                            const day = String(d.getDate()).padStart(2, '0');
                                            const dateStr = `${y}-${m}-${day}`;
                                            const cellAssignments = getCellAssignments(emp.id, dateStr);
                                            
                                            let cellBg = isWeekend(d) ? 'bg-orange-50' : 'bg-white';
                                            const hasBlock = cellAssignments.some(a => a.isManualLock);
                                            
                                            if (hasBlock) cellBg = 'bg-red-50 pattern-diagonal-lines-sm';

                                            return (
                                                <td 
                                                    key={i} 
                                                    onClick={() => handleCellClick(emp.id, dateStr, emp.name)}
                                                    className={`border-gray-200 p-0 relative h-16 text-center cursor-pointer hover:brightness-95 align-top
                                                        ${isSaturday(d) ? 'border-r-2 border-r-gray-400' : 'border-r'}
                                                        ${cellBg}
                                                    `}
                                                >
                                                    <div className="w-full h-full flex flex-col gap-0.5 p-0.5 justify-start">
                                                        {hasBlock ? (
                                                            <div className="flex-1 flex items-center justify-center text-red-500">
                                                                <Lock size={14}/>
                                                            </div>
                                                        ) : (
                                                            cellAssignments.map((assignment, idx) => {
                                                                const def = shiftDefs[assignment.shiftCode];
                                                                const chipColor = def ? RulesService.getShiftColor(def.category, def.code) : 'bg-gray-200';
                                                                
                                                                // FIXED HEIGHT CHIP for consistent visual weight
                                                                return (
                                                                    <div 
                                                                        key={idx} 
                                                                        className={`h-5 w-full rounded flex items-center justify-center text-[9px] font-bold leading-none border shadow-sm ${chipColor} flex-none`}
                                                                        title={def?.label}
                                                                    >
                                                                        {assignment.shiftCode}
                                                                    </div>
                                                                )
                                                            })
                                                        )}
                                                    </div>

                                                    {cellAssignments.length > 0 && canEdit && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleClearDay(emp.id, dateStr); }}
                                                            className="absolute top-0 right-0 hidden group-hover:flex bg-white rounded-full p-0.5 shadow-sm border border-gray-300 z-10 hover:text-red-600"
                                                            title="Limpar Dia"
                                                        >
                                                            <Trash2 size={10} />
                                                        </button>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>

                                    {/* ROW 2: WEEKLY SUMMARY */}
                                    <tr className="bg-gray-50/50">
                                        <td className="sticky left-0 bg-gray-50 z-20 border-r border-b border-gray-300 px-4 py-1 text-[10px] text-right text-gray-400 font-medium align-middle">
                                            Resumo Semanal
                                        </td>

                                        {weekSegments.map((segment, idx) => {
                                            const hours = RulesService.calculateRangeHours(emp.id, assignments, segment.fullWeekStart, segment.fullWeekEnd, shiftDefs);
                                            const y = segment.fullWeekStart.getFullYear();
                                            const m = String(segment.fullWeekStart.getMonth() + 1).padStart(2, '0');
                                            const d = String(segment.fullWeekStart.getDate()).padStart(2, '0');
                                            const noteKey = `${emp.id}-${y}-${m}-${d}`;
                                            const isOverload = hours > 44;
                                            
                                            return (
                                                <td 
                                                    key={idx} 
                                                    colSpan={segment.colSpan}
                                                    className={`border-b border-gray-300 px-2 py-1 align-top relative
                                                        ${idx < weekSegments.length - 1 ? 'border-r-2 border-r-gray-400' : 'border-r border-gray-200'}
                                                    `}
                                                >
                                                    <div className="flex items-center justify-between gap-2 h-full">
                                                        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap
                                                            ${isOverload ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-200'}
                                                        `}>
                                                            {hours}h
                                                        </div>

                                                        <div className="flex-1 relative group/input">
                                                            <input 
                                                                type="text"
                                                                value={weeklyNotes[noteKey] || ''}
                                                                onChange={(e) => saveNote(noteKey, e.target.value)}
                                                                readOnly={!canEdit}
                                                                placeholder={canEdit ? "Obs..." : ""}
                                                                className={`w-full bg-transparent text-[10px] text-gray-600 placeholder-gray-300 border-b border-transparent focus:border-blue-400 focus:outline-none transition-colors px-1 ${!canEdit ? 'cursor-default' : ''}`}
                                                            />
                                                            {!weeklyNotes[noteKey] && canEdit && (
                                                                <MessageSquare size={10} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none opacity-0 group-hover/input:opacity-100" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
                {filteredEmployees.length === 0 && (
                     <div className="p-10 text-center text-gray-500">
                        Nenhum servidor encontrado.
                    </div>
                )}
            </div>
            
            <div className="flex flex-wrap gap-4 text-xs text-gray-500 justify-center">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded-sm"></div> Manhã</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded-sm"></div> Tarde</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-indigo-100 border border-indigo-300 rounded-sm"></div> Noite</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 border border-red-200 rounded-sm"></div> Bloqueio</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded-sm"></div> Banco (Negativo)</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded-sm"></div> Banco (Positivo)</div>
                <div className="flex items-center gap-1 font-bold"><span className="border-r-2 border-gray-400 h-3 w-1 inline-block"></span> Semanas (Dom-Sáb)</div>
            </div>
        </div>
    );
};

export default ScaleGrid;