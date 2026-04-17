import React, { useState, useMemo } from 'react';
import { Employee, ShiftAssignment, ShiftDefinition, Vehicle, Sector } from '../types';
import { FileText, Calendar, Download, Users, Truck, MapPin } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DailyReportViewProps {
    employees: Employee[];
    assignments: ShiftAssignment[];
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
};

const DailyReportView: React.FC<DailyReportViewProps> = ({ employees = [], assignments = [], shiftDefs = {}, vehicles = [], sectors = [], onAssignmentsChange }) => {
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedShift, setSelectedShift] = useState<string>('Todos');

    // Filter assignments for the selected day and shift
    const dailyAssignments = useMemo(() => {
        return assignments.filter(a => {
            if (a.date !== selectedDate || a.shiftCode === 'BLK') return false;
            if (selectedShift !== 'Todos') {
                const def = shiftDefs[a.shiftCode];
                if (!def || def.category !== selectedShift) return false;
            }
            return true;
        });
    }, [assignments, selectedDate, selectedShift, shiftDefs]);

    // Group by professional category
    const onDutyByRole = useMemo(() => {
        const result: Record<string, { employee: Employee, assignment: ShiftAssignment, def: ShiftDefinition }[]> = {};
        
        Object.keys(ROLE_COLORS).forEach(role => {
            result[role] = [];
        });

        dailyAssignments.forEach(a => {
            const emp = employees.find(e => e.id === a.employeeId);
            const def = shiftDefs[a.shiftCode];
            
            // Filtra banco de horas e afastamentos da escala de assistência diária
            if (emp && def && def.category !== 'Afastamento' && def.category !== 'Banco de Horas') {
                if (!result[emp.role]) {
                    result[emp.role] = [];
                }
                result[emp.role].push({ employee: emp, assignment: a, def });
            }
        });

        // Sort by period, then by name
        const periodOrder: Record<string, number> = { 'Manhã': 1, 'Tarde': 2, 'Noite': 3, 'Legenda Especial': 4 };
        Object.keys(result).forEach(role => {
            result[role].sort((a, b) => {
                const orderA = periodOrder[a.def.category] || 99;
                const orderB = periodOrder[b.def.category] || 99;
                if (orderA !== orderB) return orderA - orderB;
                return (a.employee.name || '').localeCompare(b.employee.name || '');
            });
        });

        return result;
    }, [dailyAssignments, employees, shiftDefs]);

    const handleAllocationChange = (assignmentId: string, type: 'VEHICLE' | 'SECTOR' | 'NONE', targetId: string) => {
        const assignment = assignments.find(a => a.id === assignmentId);
        if (assignment) {
            const updatedAssignment = { ...assignment };
            if (type === 'NONE') {
                delete updatedAssignment.allocation;
            } else {
                updatedAssignment.allocation = { type, id: targetId };
            }
            onAssignmentsChange([updatedAssignment]);
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(18);
        doc.setTextColor(0, 86, 179); // gdf-primary
        doc.text('Relatório Diário de Escala', 14, 20);
        
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        const [y, m, d] = selectedDate.split('-');
        doc.text(`Data: ${d}/${m}/${y}`, 14, 28);

        let currentY = 35;

        (Object.entries(onDutyByRole) as [string, { employee: Employee, assignment: ShiftAssignment, def: ShiftDefinition }[]][]).forEach(([role, staff]) => {
            if (staff.length === 0) return;

            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text(`${role} (${staff.length})`, 14, currentY);
            currentY += 5;

            const tableData = staff.map(s => [
                s.employee.name,
                s.employee.matricula,
                s.assignment.shiftCode,
                `${s.def.start} - ${s.def.end}`,
                `${s.def.hours}h`
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [['Nome', 'Matrícula', 'Legenda', 'Horário', 'Carga']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: 'bold' },
                styles: { fontSize: 10 },
                margin: { left: 14, right: 14 },
            });

            currentY = (doc as any).lastAutoTable.finalY + 15;
            
            // Add new page if close to bottom
            if (currentY > 270) {
                doc.addPage();
                currentY = 20;
            }
        });

        doc.save(`escala_diaria_${selectedDate}.pdf`);
    };

    const handleExportCSV = () => {
        const headers = ['Nome', 'Cargo', 'Matrícula', 'Legenda', 'Horário', 'Carga Horária'];
        const rows: string[] = [];

        (Object.entries(onDutyByRole) as [string, { employee: Employee, assignment: ShiftAssignment, def: ShiftDefinition }[]][]).forEach(([role, staff]) => {
            staff.forEach(s => {
                rows.push([
                    s.employee.name,
                    s.employee.role,
                    s.employee.matricula,
                    s.assignment.shiftCode,
                    `${s.def.start} - ${s.def.end}`,
                    `${s.def.hours}h`
                ].map(val => `"${val}"`).join(','));
            });
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `escala_diaria_${selectedDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalStaffOnDuty = (Object.values(onDutyByRole) as { employee: Employee, assignment: ShiftAssignment, def: ShiftDefinition }[][]).reduce((acc, staff) => acc + staff.length, 0);

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Calendar className="text-gdf-primary" size={20} /> Relatório Diário
                        </h3>
                        <p className="text-sm text-gray-500">Visualize e exporte a escala de um dia específico.</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Data</label>
                            <input 
                                type="date" 
                                className="border border-gray-300 rounded-md shadow-sm focus:ring-gdf-primary focus:border-gdf-primary text-sm p-2 bg-white"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Turno</label>
                            <select 
                                className="border border-gray-300 rounded-md shadow-sm focus:ring-gdf-primary focus:border-gdf-primary text-sm p-2 bg-white"
                                value={selectedShift}
                                onChange={(e) => setSelectedShift(e.target.value)}
                            >
                                <option value="Todos">Todos</option>
                                <option value="Manhã">Manhã</option>
                                <option value="Tarde">Tarde</option>
                                <option value="Noite">Noite</option>
                            </select>
                        </div>
                        <div className="flex gap-2 self-end">
                            <button 
                                onClick={handleExportPDF}
                                disabled={totalStaffOnDuty === 0}
                                className="bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded flex items-center gap-2 hover:bg-red-100 transition shadow-sm text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FileText size={16} /> PDF
                            </button>
                            <button 
                                onClick={handleExportCSV}
                                disabled={totalStaffOnDuty === 0}
                                className="bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded flex items-center gap-2 hover:bg-green-100 transition shadow-sm text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Download size={16} /> CSV
                            </button>
                        </div>
                    </div>
                </div>

                {totalStaffOnDuty === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                        <Users size={48} className="mx-auto mb-3 opacity-20" />
                        <p>Nenhum profissional escalado para esta data.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Allocation Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                                    <Truck size={18} /> Viaturas
                                </h4>
                                <div className="space-y-2">
                                    {vehicles.map(v => {
                                        const assignedStaff = dailyAssignments.filter(a => a.allocation?.type === 'VEHICLE' && a.allocation.id === v.id);
                                        return (
                                            <div key={v.id} className={`p-3 rounded bg-white border ${v.isBlocked ? 'border-red-300 opacity-75' : 'border-blue-200'} shadow-sm`}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className={`font-semibold ${v.isBlocked ? 'text-red-700' : 'text-gray-800'}`}>
                                                        {v.code} - {v.name} {v.isBlocked && '(Bloqueada)'}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{v.plate}</span>
                                                </div>
                                                {assignedStaff.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {assignedStaff.map(a => {
                                                            const emp = employees.find(e => e.id === a.employeeId);
                                                            return emp ? (
                                                                <span key={a.id} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                                    {emp.name} ({a.shiftCode})
                                                                </span>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-400 italic">Nenhum servidor alocado.</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {vehicles.length === 0 && <p className="text-sm text-gray-500">Nenhuma viatura cadastrada.</p>}
                                </div>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                                    <MapPin size={18} /> Setores
                                </h4>
                                <div className="space-y-2">
                                    {sectors.map(s => {
                                        const assignedStaff = dailyAssignments.filter(a => a.allocation?.type === 'SECTOR' && a.allocation.id === s.id);
                                        return (
                                            <div key={s.id} className="p-3 rounded bg-white border border-green-200 shadow-sm">
                                                <div className="font-semibold text-gray-800 mb-2">{s.name}</div>
                                                {assignedStaff.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {assignedStaff.map(a => {
                                                            const emp = employees.find(e => e.id === a.employeeId);
                                                            return emp ? (
                                                                <span key={a.id} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                                    {emp.name} ({a.shiftCode})
                                                                </span>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-400 italic">Nenhum servidor alocado.</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {sectors.length === 0 && <p className="text-sm text-gray-500">Nenhum setor cadastrado.</p>}
                                </div>
                            </div>
                        </div>

                        {(Object.entries(onDutyByRole) as [string, { employee: Employee, assignment: ShiftAssignment, def: ShiftDefinition }[]][]).map(([role, staff]) => {
                            if (staff.length === 0) return null;
                            return (
                                <div key={role}>
                                    <h4 className="font-bold text-gray-700 bg-gray-50 px-4 py-2 rounded-t-lg border border-b-0 flex justify-between items-center">
                                        <span>{role}</span>
                                        <span className="text-sm font-normal text-gray-500 bg-white px-2 py-0.5 rounded border">{staff.length} profissionais</span>
                                    </h4>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 border">
                                            <thead className="bg-white">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Servidor</th>
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Matrícula</th>
                                                    <th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">Legenda</th>
                                                    <th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">Horário</th>
                                                    <th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">Carga</th>
                                                    <th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">Alocação</th>
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
                                                        <td className="px-4 py-2 text-sm text-center font-semibold text-blue-600">
                                                            <span className="bg-blue-100 px-2 py-0.5 rounded">{s.assignment.shiftCode}</span>
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-center text-gray-600">{s.def.start} - {s.def.end}</td>
                                                        <td className="px-4 py-2 text-sm text-center font-semibold text-gray-700">{s.def.hours}h</td>
                                                        <td className="px-4 py-2 text-sm text-center">
                                                            <select
                                                                className="border border-gray-300 rounded text-xs p-1 bg-white max-w-[150px]"
                                                                value={s.assignment.allocation ? `${s.assignment.allocation.type}_${s.assignment.allocation.id}` : 'NONE'}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val === 'NONE') {
                                                                        handleAllocationChange(s.assignment.id, 'NONE', '');
                                                                    } else {
                                                                        const [type, id] = val.split('_');
                                                                        handleAllocationChange(s.assignment.id, type as 'VEHICLE' | 'SECTOR', id);
                                                                    }
                                                                }}
                                                            >
                                                                <option value="NONE">Não Alocado</option>
                                                                <optgroup label="Viaturas">
                                                                    {vehicles.map(v => (
                                                                        <option key={`VEHICLE_${v.id}`} value={`VEHICLE_${v.id}`} disabled={v.isBlocked}>
                                                                            {v.code} - {v.name} {v.isBlocked ? '(Bloqueada)' : ''}
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                                <optgroup label="Setores">
                                                                    {sectors.map(sec => (
                                                                        <option key={`SECTOR_${sec.id}`} value={`SECTOR_${sec.id}`}>
                                                                            {sec.name}
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                            </select>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DailyReportView;
