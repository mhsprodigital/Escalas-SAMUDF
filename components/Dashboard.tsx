import React, { useState, useMemo } from 'react';
import { Employee, ShiftAssignment, ShiftDefinition } from '../types';
import { Users, AlertTriangle, Building2, Calendar, X, Filter } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

interface DashboardProps {
    employees: Employee[];
    assignments: ShiftAssignment[];
    startDate: Date;
    shiftDefs: Record<string, ShiftDefinition>;
}

interface DrillDownData {
    date: string;
    category: string;
    staff: Array<{
        name: string;
        shiftCode: string;
        duration: number;
        color: string;
    }>;
}

const ROLE_COLORS: Record<string, string> = {
    'Enfermeiro(a)': '#0056b3',
    'Técnico(a) em Enfermagem': '#00a8cc',
    'Médico(a)': '#10b981',
    'Fisioterapeuta': '#f59e0b',
    'Nutricionista': '#8b5cf6',
    'Psicólogo(a)': '#ec4899',
    'Administrativo': '#6b7280',
};

const Dashboard: React.FC<DashboardProps> = ({ employees, assignments, startDate, shiftDefs }) => {
    const [drillDown, setDrillDown] = useState<DrillDownData | null>(null);
    const [showPendencies, setShowPendencies] = useState(false);
    
    const [roleFilter, setRoleFilter] = useState<string>('Todos');
    const [periodFilter, setPeriodFilter] = useState<string>('Todos');
    
    // Month and Year Filters
    const [selectedMonth, setSelectedMonth] = useState<number>(startDate.getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(startDate.getFullYear());

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return [currentYear - 1, currentYear, currentYear + 1];
    }, []);

    // Date Range: Selected Month
    const daysInMonth = useMemo(() => {
        const date = new Date(selectedYear, selectedMonth, 1);
        const days = [];
        while (date.getMonth() === selectedMonth) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    }, [selectedMonth, selectedYear]);

    const monthDateStrings = useMemo(() => {
        return new Set(daysInMonth.map(d => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }));
    }, [daysInMonth]);

    // Filtered Employees
    const filteredEmployees = useMemo(() => {
        if (roleFilter === 'Todos') return employees;
        return employees.filter(e => e.role === roleFilter);
    }, [employees, roleFilter]);

    // Filtered Assignments for "Horas Alocadas"
    const filteredAssignments = useMemo(() => {
        let filtered = assignments.filter(a => a.shiftCode !== 'BLK' && monthDateStrings.has(a.date));
        
        if (roleFilter !== 'Todos') {
            filtered = filtered.filter(a => {
                const emp = employees.find(e => e.id === a.employeeId);
                return emp?.role === roleFilter;
            });
        }
        
        if (periodFilter !== 'Todos') {
            filtered = filtered.filter(a => {
                const shiftDef = shiftDefs[a.shiftCode];
                return shiftDef?.category === periodFilter;
            });
        }
        
        return filtered;
    }, [assignments, employees, roleFilter, periodFilter, monthDateStrings, shiftDefs]);

    // 1. Calculate General Stats
    const totalStaff = filteredEmployees.length;
    const totalHoursAssigned = filteredAssignments.reduce((acc, curr) => acc + curr.duration, 0);
    
    // Pendencies calculated monthly
    const pendencies = useMemo(() => {
        const weeksInMonth = daysInMonth.length / 7;
        
        return filteredEmployees.map(e => {
            const empAssignments = assignments.filter(a => 
                a.employeeId === e.id && 
                a.shiftCode !== 'BLK' && 
                monthDateStrings.has(a.date)
            );
            
            const assigned = empAssignments.reduce((sum, a) => sum + a.duration, 0);
            const expectedMonthly = Math.round(e.contractHours * weeksInMonth);
            const diff = expectedMonthly - assigned;
            
            // Allow a small variation (e.g., +/- 6 hours) before flagging as a pendency
            // since shifts are often in multiples of 6 or 12 and might not perfectly match
            // the exact mathematical monthly expectation.
            const isPendency = Math.abs(diff) > 6;
            
            return {
                employee: e,
                assigned,
                contract: expectedMonthly,
                weeklyContract: e.contractHours,
                diff,
                isPendency
            };
        }).filter(p => p.isPendency);
    }, [filteredEmployees, assignments, daysInMonth, monthDateStrings]);
    
    // 2. Prepare Chart Data (Group by Role)
    const chartData = useMemo(() => {
        return daysInMonth.map(day => {
            const y = day.getFullYear();
            const m = String(day.getMonth() + 1).padStart(2, '0');
            const d = String(day.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;
            
            let dayAssignments = assignments.filter(a => a.date === dateStr && a.shiftCode !== 'BLK');
            
            // Apply Role Filter
            if (roleFilter !== 'Todos') {
                dayAssignments = dayAssignments.filter(a => {
                    const emp = employees.find(e => e.id === a.employeeId);
                    return emp?.role === roleFilter;
                });
            }

            // Apply Period Filter
            if (periodFilter !== 'Todos') {
                dayAssignments = dayAssignments.filter(a => {
                    const shiftDef = shiftDefs[a.shiftCode];
                    return shiftDef?.category === periodFilter;
                });
            }

            const roleCounts: Record<string, number> = {};
            Object.keys(ROLE_COLORS).forEach(r => roleCounts[r] = 0);

            const uniqueEmployeesPerRole: Record<string, Set<string>> = {};
            Object.keys(ROLE_COLORS).forEach(r => uniqueEmployeesPerRole[r] = new Set());

            dayAssignments.forEach(assign => {
                const emp = employees.find(e => e.id === assign.employeeId);
                if (emp && emp.role && uniqueEmployeesPerRole[emp.role]) {
                    uniqueEmployeesPerRole[emp.role].add(assign.employeeId);
                }
            });

            Object.keys(ROLE_COLORS).forEach(r => {
                roleCounts[r] = uniqueEmployeesPerRole[r].size;
            });

            return {
                date: dateStr,
                displayDate: day.getDate().toString(),
                fullDisplayDate: day.toLocaleDateString('pt-BR'),
                ...roleCounts
            };
        });
    }, [daysInMonth, assignments, employees, roleFilter, periodFilter]);

    // Handle Click on Bar
    const handleBarClick = (data: any, roleKey: string) => {
        const dateStr = data.date;
        let dayAssignments = assignments.filter(a => a.date === dateStr && a.shiftCode !== 'BLK');
        
        if (periodFilter !== 'Todos') {
            dayAssignments = dayAssignments.filter(a => {
                const shiftDef = shiftDefs[a.shiftCode];
                return shiftDef?.category === periodFilter;
            });
        }

        const staffList = dayAssignments
            .map(assign => {
                const emp = employees.find(e => e.id === assign.employeeId);
                if (emp && emp.role === roleKey) {
                    return {
                        name: emp.name,
                        shiftCode: assign.shiftCode,
                        duration: assign.duration,
                        color: emp.colorIdentifier
                    };
                }
                return null;
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);

        // Deduplicate staffList in case someone has two shifts in the SAME day
        const uniqueStaff = Array.from(new Map(staffList.map(item => [item.name, item])).values());

        setDrillDown({
            date: data.fullDisplayDate,
            category: roleKey,
            staff: uniqueStaff
        });
    };

    return (
        <div className="space-y-6">
            {/* Modal for Drill Down */}
            {drillDown && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDrillDown(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                    <Users size={20} className="text-gdf-primary"/>
                                    {drillDown.category}
                                </h3>
                                <p className="text-sm text-gray-500">{drillDown.date}</p>
                            </div>
                            <button onClick={() => setDrillDown(null)} className="text-gray-400 hover:text-red-500">
                                <X size={24}/>
                            </button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            {drillDown.staff.length > 0 ? (
                                <div className="space-y-2">
                                    {drillDown.staff.map((s, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:bg-blue-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full ${s.color} flex items-center justify-center text-white text-xs font-bold`}>
                                                    {s.name.charAt(0)}
                                                </div>
                                                <span className="font-semibold text-gray-800">{s.name}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-sm font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">{s.shiftCode}</span>
                                                <span className="text-xs text-gray-400">{s.duration}h</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-4">Nenhum profissional escalado.</p>
                            )}
                        </div>
                        <div className="bg-gray-50 p-3 text-center text-xs text-gray-400 border-t">
                            Total: {drillDown.staff.length} Profissionais
                        </div>
                    </div>
                </div>
            )}

            {/* Pendencies Modal */}
            {showPendencies && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowPendencies(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-red-800 text-lg flex items-center gap-2">
                                    <AlertTriangle size={20} className="text-red-600"/>
                                    Pendências de Carga Horária Mensal
                                </h3>
                                <p className="text-sm text-red-600">Diferença entre a carga mensal esperada e a alocada no mês atual</p>
                            </div>
                            <button onClick={() => setShowPendencies(false)} className="text-red-400 hover:text-red-600">
                                <X size={24}/>
                            </button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            {pendencies.length > 0 ? (
                                <div className="space-y-3">
                                    {pendencies.map((p, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full ${p.employee.colorIdentifier} flex items-center justify-center text-white text-sm font-bold`}>
                                                    {p.employee.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-gray-800 block">{p.employee.name}</span>
                                                    <span className="text-xs text-gray-500">{p.employee.role}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500">Contrato Mensal</p>
                                                    <p className="font-semibold">{p.contract}h</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500">Alocado no Mês</p>
                                                    <p className="font-semibold">{p.assigned}h</p>
                                                </div>
                                                <div className={`text-right px-3 py-1 rounded ${p.diff > 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    <p className="text-xs font-bold">{p.diff > 0 ? 'Faltam' : 'Excedem'}</p>
                                                    <p className="font-bold">{Math.abs(p.diff)}h</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-8">Nenhuma pendência encontrada. Todos os servidores estão com a carga horária correta no mês.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b pb-4 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Painel Gerencial</h2>
                    <p className="text-gray-500 text-sm">Visão consolidada da escala selecionada.</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <div className="flex-1 md:w-32">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Mês</label>
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
                    <div className="flex-1 md:w-24">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Ano</label>
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
                    <div className="flex-1 md:w-48">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Categoria Profissional</label>
                        <select 
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-gdf-primary focus:border-gdf-primary text-sm p-2 border bg-white"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="Todos">Todas as Categorias</option>
                            {Object.keys(ROLE_COLORS).map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 md:w-48">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Período</label>
                        <select 
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-gdf-primary focus:border-gdf-primary text-sm p-2 border bg-white"
                            value={periodFilter}
                            onChange={(e) => setPeriodFilter(e.target.value)}
                        >
                            <option value="Todos">Todos os Períodos</option>
                            <option value="Manhã">Manhã</option>
                            <option value="Tarde">Tarde</option>
                            <option value="Noite">Noite</option>
                        </select>
                    </div>
                </div>
            </div>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500 flex justify-between items-center">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Total Servidores</p>
                        <p className="text-2xl font-bold text-gray-800">{totalStaff}</p>
                    </div>
                    <Users className="text-blue-200" size={32} />
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500 flex justify-between items-center">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Horas Alocadas</p>
                        <p className="text-2xl font-bold text-gray-800">{totalHoursAssigned}h</p>
                    </div>
                    <Building2 className="text-yellow-200" size={32} />
                </div>
                <div 
                    className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500 flex justify-between items-center cursor-pointer hover:bg-red-50 transition-colors"
                    onClick={() => setShowPendencies(true)}
                >
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Pendências</p>
                        <p className="text-2xl font-bold text-gray-800">
                             {pendencies.length}
                        </p>
                    </div>
                    <AlertTriangle className="text-red-200" size={32} />
                </div>
            </div>

            {/* Daily Distribution Chart */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                        <Calendar className="text-gdf-primary" size={20}/>
                        Distribuição Diária por Categoria
                    </h3>
                    <div className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded border flex items-center gap-1">
                        <Filter size={14} />
                        Filtros aplicados ao gráfico
                    </div>
                </div>

                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/>
                            <XAxis 
                                dataKey="displayDate" 
                                tickLine={false} 
                                axisLine={false} 
                                tick={{fill: '#6b7280', fontSize: 12}}
                            />
                            <YAxis 
                                tickLine={false} 
                                axisLine={false} 
                                tick={{fill: '#6b7280', fontSize: 12}}
                                allowDecimals={false}
                            />
                            <Tooltip 
                                cursor={{fill: '#f3f4f6'}}
                                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                            />
                            <Legend wrapperStyle={{paddingTop: '20px'}}/>
                            
                            {/* Render a Bar for each Role */}
                            {Object.keys(ROLE_COLORS).map((role) => (
                                (roleFilter === 'Todos' || roleFilter === role) && (
                                    <Bar 
                                        key={role} 
                                        dataKey={role} 
                                        name={role}
                                        stackId="a"
                                        fill={ROLE_COLORS[role]} 
                                        radius={[0, 0, 0, 0]}
                                        onClick={(data) => handleBarClick(data, role)}
                                        cursor="pointer"
                                    />
                                )
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;