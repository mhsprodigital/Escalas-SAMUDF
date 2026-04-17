import React, { useState, useMemo } from 'react';
import { Employee, ShiftAssignment, ShiftDefinition, Vehicle, Sector } from '../types';
import { FileText, Calendar, Users, Activity, X, Search, Filter, Download, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DailyReportView from './DailyReportView';
import AllocationReportView from './AllocationReportView';

interface ReportsViewProps {
    employees: Employee[];
    assignments: ShiftAssignment[];
    startDate: Date;
    shiftDefs: Record<string, ShiftDefinition>;
    vehicles: Vehicle[];
    sectors: Sector[];
    onAssignmentsChange: (assignments: ShiftAssignment[]) => void;
}

const ROLE_COLORS: Record<string, string> = {
    'Enfermeiro(a)': '#0056b3',
    'Técnico(a) em Enfermagem': '#00a8cc',
    'Médico(a)': '#10b981',
    'Fisioterapeuta': '#f59e0b',
    'Nutricionista': '#8b5cf6',
    'Psicólogo(a)': '#ec4899',
    'Administrativo': '#6b7280',
    'Administrador': '#1e293b',
};

const ReportsView: React.FC<ReportsViewProps> = ({ employees = [], assignments = [], startDate, shiftDefs = {}, vehicles = [], sectors = [], onAssignmentsChange }) => {
    const [activeTab, setActiveTab] = useState<'MENSAL' | 'DIARIO' | 'ALOCACAO' | 'CONTRATOS'>('MENSAL');
    const [selectedMonth, setSelectedMonth] = useState<number>(startDate.getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(startDate.getFullYear());
    const [activeAbsenceCard, setActiveAbsenceCard] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRole, setSelectedRole] = useState('Todos');

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return [currentYear - 1, currentYear, currentYear + 1];
    }, []);

    const filteredEmployees = useMemo(() => {
        if (!employees) return [];
        return employees.filter(emp => {
            const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  emp.matricula.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = selectedRole === 'Todos' || emp.role === selectedRole;
            return matchesSearch && matchesRole;
        });
    }, [employees, searchTerm, selectedRole]);

    // Filter assignments for the selected month
    const monthAssignments = useMemo(() => {
        return assignments.filter(a => {
            if (a.shiftCode === 'BLK') return false;
            const date = new Date(a.date + 'T00:00:00');
            return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
        });
    }, [assignments, selectedMonth, selectedYear]);

    // 1. Report of everyone on duty, separated by professional categories
    const onDutyByRole = useMemo<Record<string, { employee: Employee, totalHours: number, shifts: number }[]>>(() => {
        const result: Record<string, { employee: Employee, totalHours: number, shifts: number }[]> = {};
        
        Object.keys(ROLE_COLORS).forEach(role => {
            result[role] = [];
        });

        const employeeStats: Record<string, { totalHours: number, shifts: number }> = {};

        monthAssignments.forEach(a => {
            const def = shiftDefs[a.shiftCode];
            if (def && def.category !== 'Afastamento') {
                if (!employeeStats[a.employeeId]) {
                    employeeStats[a.employeeId] = { totalHours: 0, shifts: 0 };
                }
                employeeStats[a.employeeId].totalHours += a.duration;
                employeeStats[a.employeeId].shifts += 1;
            }
        });

        filteredEmployees.forEach(emp => {
            if (employeeStats[emp.id] && result[emp.role]) {
                result[emp.role].push({
                    employee: emp,
                    totalHours: employeeStats[emp.id].totalHours,
                    shifts: employeeStats[emp.id].shifts
                });
            }
        });

        // Sort by name
        Object.keys(result).forEach(role => {
            result[role].sort((a, b) => (a.employee.name || '').localeCompare(b.employee.name || ''));
        });

        return result;
    }, [monthAssignments, filteredEmployees, shiftDefs]);

    // 2. Absenteeism Cards
    const absences = useMemo<Record<string, { count: number, details: { employee: Employee, date: string, code: string }[] }>>(() => {
        const stats: Record<string, { count: number, details: { employee: Employee, date: string, code: string }[] }> = {
            'FE': { count: 0, details: [] }, // Férias
            'LM': { count: 0, details: [] }, // Licença Médica
            'AF': { count: 0, details: [] }, // Afastamento Genérico
            'CE': { count: 0, details: [] }, // Cedido
            'LP': { count: 0, details: [] }, // Licença Prêmio
            'FR': { count: 0, details: [] }, // Feriado
            'FF': { count: 0, details: [] }, // Folga Compensatória
            'LE': { count: 0, details: [] }, // Legenda Especial
            'OUTROS': { count: 0, details: [] }
        };

        monthAssignments.forEach(a => {
            const def = shiftDefs[a.shiftCode];
            const isAbsence = def && (
                def.category === 'Afastamento' || 
                def.category === 'Legenda Especial' ||
                (def.category === 'Banco de Horas' && a.duration < 0)
            );

            if (isAbsence) {
                const emp = filteredEmployees.find(e => e.id === a.employeeId);
                if (emp) {
                    let type = 'OUTROS';
                    if (def.category === 'Legenda Especial') type = 'LE';
                    else if (def.category === 'Banco de Horas') type = 'AF'; // BH Negativo agrupa em Afastamentos
                    else if (a.shiftCode.startsWith('FE')) type = 'FE';
                    else if (a.shiftCode.startsWith('LM')) type = 'LM';
                    else if (a.shiftCode.startsWith('AF')) type = 'AF';
                    else if (a.shiftCode.startsWith('CE')) type = 'CE';
                    else if (a.shiftCode.startsWith('LP')) type = 'LP';
                    else if (a.shiftCode.startsWith('FR')) type = 'FR';
                    else if (a.shiftCode.startsWith('FF')) type = 'FF';

                    if (!stats[type]) stats[type] = { count: 0, details: [] };
                    stats[type].details.push({
                        employee: emp,
                        date: a.date,
                        code: a.shiftCode
                    });
                }
            }
        });

        // Calculate count as unique employees
        Object.keys(stats).forEach(type => {
            const uniqueEmpIds = new Set(stats[type].details.map(d => d.employee.id));
            stats[type].count = uniqueEmpIds.size;
        });

        return stats;
    }, [monthAssignments, filteredEmployees, shiftDefs]);

    const absenceLabels: Record<string, string> = {
        'FE': 'Férias',
        'LM': 'Licença Médica',
        'AF': 'Afastamentos',
        'CE': 'Cedidos',
        'LP': 'Licença Prêmio',
        'FR': 'Feriados',
        'FF': 'Folgas Compensatórias',
        'LE': 'Legendas Especiais',
        'OUTROS': 'Outros Afastamentos'
    };

    const absenceColors: Record<string, string> = {
        'FE': 'border-green-500 text-green-700 bg-green-50',
        'LM': 'border-red-500 text-red-700 bg-red-50',
        'AF': 'border-orange-500 text-orange-700 bg-orange-50',
        'CE': 'border-purple-500 text-purple-700 bg-purple-50',
        'LP': 'border-blue-500 text-blue-700 bg-blue-50',
        'FR': 'border-yellow-500 text-yellow-700 bg-yellow-50',
        'FF': 'border-teal-500 text-teal-700 bg-teal-50',
        'LE': 'border-pink-500 text-pink-700 bg-pink-50',
        'OUTROS': 'border-gray-500 text-gray-700 bg-gray-50'
    };

    // Group details by employee for the modal
    const getGroupedAbsenceDetails = (type: string) => {
        const details = absences[type]?.details || [];
        const grouped: Record<string, { employee: Employee, dates: { date: string, code: string }[] }> = {};
        
        details.forEach(d => {
            if (!grouped[d.employee.id]) {
                grouped[d.employee.id] = { employee: d.employee, dates: [] };
            }
            grouped[d.employee.id].dates.push({ date: d.date, code: d.code });
        });

        return Object.values(grouped).sort((a,b) => (a.employee.name || '').localeCompare(b.employee.name || '')).map(g => {
            // Sort dates
            g.dates.sort((a, b) => a.date.localeCompare(b.date));
            return g;
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b pb-4 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="text-gdf-primary" /> Relatórios
                    </h2>
                    <p className="text-gray-500 text-sm">Análise de plantões e absenteísmo.</p>
                </div>
                
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('MENSAL')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'MENSAL' ? 'bg-white text-gdf-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Relatório Mensal
                    </button>
                    <button 
                        onClick={() => setActiveTab('DIARIO')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'DIARIO' ? 'bg-white text-gdf-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Relatório Diário
                    </button>
                    <button 
                        onClick={() => setActiveTab('ALOCACAO')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'ALOCACAO' ? 'bg-white text-gdf-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Distribuição
                    </button>
                    <button 
                        onClick={() => setActiveTab('CONTRATOS')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'CONTRATOS' ? 'bg-white text-gdf-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Contratos
                    </button>
                </div>
            </div>

            {activeTab === 'DIARIO' ? (
                <DailyReportView 
                    employees={employees} 
                    assignments={assignments} 
                    shiftDefs={shiftDefs} 
                    vehicles={vehicles}
                    sectors={sectors}
                    onAssignmentsChange={onAssignmentsChange}
                />
            ) : activeTab === 'ALOCACAO' ? (
                <AllocationReportView
                    employees={employees} 
                    assignments={assignments} 
                    shiftDefs={shiftDefs} 
                    vehicles={vehicles}
                    sectors={sectors}
                />
            ) : activeTab === 'CONTRATOS' ? (
                <ContractManagementReport employees={employees} />
            ) : (
                <>
                    <div className="flex flex-wrap gap-3 w-full justify-end">
                        <div className="flex-1 md:w-48 relative">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Buscar Servidor</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="Nome ou matrícula..." 
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-gdf-primary focus:border-gdf-primary text-sm p-2 pl-8 border bg-white"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <Search className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
                            </div>
                        </div>
                        <div className="flex-1 md:w-40">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Cargo</label>
                            <select 
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-gdf-primary focus:border-gdf-primary text-sm p-2 border bg-white"
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                            >
                                <option value="Todos">Todos os Cargos</option>
                                {Object.keys(ROLE_COLORS).map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>
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
                    </div>

                    {/* Absences Modal */}
            {activeAbsenceCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setActiveAbsenceCard(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className={`p-4 border-b flex justify-between items-center ${absenceColors[activeAbsenceCard]}`}>
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Activity size={20} />
                                    Detalhamento: {absenceLabels[activeAbsenceCard]}
                                </h3>
                                <p className="text-sm opacity-80">Profissionais e períodos de afastamento no mês</p>
                            </div>
                            <button onClick={() => setActiveAbsenceCard(null)} className="hover:opacity-70">
                                <X size={24}/>
                            </button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            {getGroupedAbsenceDetails(activeAbsenceCard).length > 0 ? (
                                <div className="space-y-4">
                                    {getGroupedAbsenceDetails(activeAbsenceCard).map((item, idx) => (
                                        <div key={idx} className="bg-white border rounded-lg p-4 shadow-sm">
                                            <div className="flex items-center gap-3 mb-3 border-b pb-2">
                                                <div className={`w-8 h-8 rounded-full ${item.employee.colorIdentifier} flex items-center justify-center text-white text-xs font-bold`}>
                                                    {item.employee.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-gray-800 block">{item.employee.name}</span>
                                                    <span className="text-xs text-gray-500">{item.employee.role}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 mb-2">Dias Afastados ({item.dates.length}):</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {item.dates.map(dInfo => {
                                                        const d = new Date(dInfo.date + 'T00:00:00');
                                                        const def = shiftDefs[dInfo.code];
                                                        return (
                                                            <div key={dInfo.date} className="flex flex-col items-center bg-gray-50 rounded border p-2 min-w-[100px]">
                                                                <span className="text-xs font-bold text-gray-700">
                                                                    {d.toLocaleDateString('pt-BR')}
                                                                </span>
                                                                <span className="text-[10px] text-blue-600 font-medium">
                                                                    {def?.label || dInfo.code}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-8">Nenhum registro encontrado.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Absences Cards */}
            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Activity className="text-gdf-primary" size={20} /> Absenteísmo (Servidores no Mês)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(absences).map(([type, data]: [string, any]) => {
                        if (data.count === 0 && type === 'OUTROS') return null;
                        return (
                            <div 
                                key={type} 
                                onClick={() => data.count > 0 && setActiveAbsenceCard(type)}
                                className={`p-4 rounded-lg shadow-sm border-l-4 cursor-pointer transition-transform hover:scale-105 ${absenceColors[type] || absenceColors['OUTROS']} ${data.count === 0 ? 'opacity-50 cursor-default hover:scale-100' : ''}`}
                            >
                                <p className="text-xs font-bold uppercase opacity-80">{absenceLabels[type] || type}</p>
                                <p className="text-3xl font-bold mt-1">{data.count}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* On Duty Report */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
                    <Users className="text-gdf-primary" size={20} /> Profissionais em Plantão (Exclui Afastamentos)
                </h3>
                
                <div className="space-y-8">
                    {Object.entries(onDutyByRole).map(([role, staff]: [string, any[]]) => {
                        if (staff.length === 0) return null;
                        return (
                            <div key={role}>
                                <h4 className="font-bold text-gray-700 bg-gray-50 px-4 py-2 rounded-t-lg border border-b-0">
                                    {role} <span className="text-sm font-normal text-gray-500 ml-2">({staff.length} profissionais)</span>
                                </h4>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 border">
                                        <thead className="bg-white">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Servidor</th>
                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Matrícula</th>
                                                <th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">Plantões Realizados</th>
                                                <th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">Horas Totais</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {staff.map((s, idx) => (
                                                <tr key={idx} className="hover:bg-blue-50">
                                                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-6 h-6 rounded-full ${s.employee.colorIdentifier} flex items-center justify-center text-white text-[10px] font-bold`}>
                                                                {s.employee.name.charAt(0)}
                                                            </div>
                                                            {s.employee.name}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-500">{s.employee.matricula}</td>
                                                    <td className="px-4 py-2 text-sm text-center font-semibold text-blue-600">{s.shifts}</td>
                                                    <td className="px-4 py-2 text-sm text-center font-semibold text-gray-700">{s.totalHours}h</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            </>
            )}

        </div>
    );
};

interface ContractManagementReportProps {
    employees: Employee[];
}

const ContractManagementReport: React.FC<ContractManagementReportProps> = ({ employees }) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const temporaryEmployees = useMemo(() => {
        return employees
            .filter(emp => emp.employmentType === 'Temporário')
            .filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           emp.matricula.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => (a.contractExpiry || '').localeCompare(b.contractExpiry || ''));
    }, [employees, searchTerm]);

    const getStatusInfo = (expiryDate?: string) => {
        if (!expiryDate) return { label: 'Sem Data', color: 'bg-gray-100 text-gray-800', icon: <Clock size={14} /> };
        
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDate + 'T00:00:00');
        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { label: 'Vencido', color: 'bg-red-100 text-red-800 border-red-200', icon: <AlertCircle size={14} /> };
        if (diffDays <= 30) return { label: 'Vence em < 30 dias', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: <AlertCircle size={14} /> };
        if (diffDays <= 60) return { label: 'Vence em < 60 dias', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Clock size={14} /> };
        return { label: 'Regular', color: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle size={14} /> };
    };

    const handleExportCSV = () => {
        const headers = ['Nome', 'Matrícula', 'Cargo', 'Vínculo', 'Expiração do Contrato', 'Status'];
        const csvContent = [
            headers.join(','),
            ...temporaryEmployees.map(emp => {
                const status = getStatusInfo(emp.contractExpiry);
                return [
                    `"${emp.name}"`,
                    `"${emp.matricula}"`,
                    `"${emp.role}"`,
                    `"${emp.employmentType}"`,
                    `"${emp.contractExpiry || 'N/A'}"`,
                    `"${status.label}"`
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio_contratos_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Relatório de Monitoramento de Contratos Temporários', 14, 20);
        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);

        autoTable(doc, {
            startY: 35,
            head: [['Nome', 'Matrícula', 'Cargo', 'Validade', 'Status']],
            body: temporaryEmployees.map(emp => [
                emp.name,
                emp.matricula,
                emp.role,
                emp.contractExpiry ? new Date(emp.contractExpiry + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A',
                getStatusInfo(emp.contractExpiry).label
            ]),
            headStyles: { fillColor: [0, 86, 179] } // gdf-primary
        });

        doc.save(`relatorio_contratos_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Monitoramento de Contratos Temporários</h3>
                        <p className="text-gray-500 text-sm">Controle de validade e renovação de servidores temporários.</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium border"
                        >
                            <Download size={16} /> CSV
                        </button>
                        <button 
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-gdf-secondary text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium shadow-sm"
                        >
                            <FileText size={16} /> PDF
                        </button>
                    </div>
                </div>

                <div className="mb-6 relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text"
                        placeholder="Buscar por nome ou matrícula..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-gdf-primary outline-none text-sm transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto border rounded-xl">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Servidor</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Matrícula</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cargo</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Validade</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {temporaryEmployees.length > 0 ? (
                                temporaryEmployees.map(emp => {
                                    const status = getStatusInfo(emp.contractExpiry);
                                    return (
                                        <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full ${emp.colorIdentifier} flex items-center justify-center text-white text-xs font-bold`}>
                                                        {emp.name.charAt(0)}
                                                    </div>
                                                    <div className="text-sm font-semibold text-gray-900">{emp.name}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.matricula}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.role}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                                                {emp.contractExpiry ? new Date(emp.contractExpiry + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informada'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${status.color}`}>
                                                    {status.icon}
                                                    {status.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
                                        Nenhum servidor temporário encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100">
                    <h4 className="text-sm font-bold text-red-800 uppercase mb-2 flex items-center gap-2">
                        <AlertCircle size={16} /> Alerta Crítico
                    </h4>
                    <p className="text-xs text-red-600 leading-relaxed font-medium">
                        Contratos com menos de 30 dias de validade ou vencidos requerem ação imediata para evitar interrupção no serviço.
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100">
                    <h4 className="text-sm font-bold text-orange-800 uppercase mb-2 flex items-center gap-2">
                        <Clock size={16} /> Planejamento
                    </h4>
                    <p className="text-xs text-orange-600 leading-relaxed font-medium">
                        Contratos entre 30 e 60 dias devem ser revisados para processo de renovação ou substituição programada.
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100">
                    <h4 className="text-sm font-bold text-green-800 uppercase mb-2 flex items-center gap-2">
                        <CheckCircle size={16} /> Regularidade
                    </h4>
                    <p className="text-xs text-green-600 leading-relaxed font-medium">
                        Contratos com mais de 60 dias de validade estão em situação regular perante a gestão de pessoas.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ReportsView;
