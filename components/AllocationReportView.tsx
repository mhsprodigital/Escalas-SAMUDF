import React, { useState, useMemo } from 'react';
import { Employee, ShiftAssignment, ShiftDefinition, Vehicle, Sector } from '../types';
import { FileText, Calendar, Download, Users, Truck, MapPin } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AllocationReportViewProps {
    employees: Employee[];
    assignments: ShiftAssignment[];
    shiftDefs: Record<string, ShiftDefinition>;
    vehicles: Vehicle[];
    sectors: Sector[];
}

const AllocationReportView: React.FC<AllocationReportViewProps> = ({ employees = [], assignments = [], shiftDefs = {}, vehicles = [], sectors = [] }) => {
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedShift, setSelectedShift] = useState<string>('Todos');

    const dailyAssignments = useMemo(() => {
        return assignments.filter(a => {
            if (a.date !== selectedDate || a.shiftCode === 'BLK') return false;
            
            // Only include assignments that are actually allocated to a vehicle or sector
            if (!a.allocation) return false;

            if (selectedShift !== 'Todos') {
                const def = shiftDefs[a.shiftCode];
                if (!def || def.category !== selectedShift) return false;
            }
            return true;
        });
    }, [assignments, selectedDate, selectedShift, shiftDefs]);

    // Group by allocation type/id
    const allocationsList = useMemo(() => {
        const result: { 
            type: 'VEHICLE' | 'SECTOR',
            id: string,
            name: string,
            staff: { employee: Employee, assignment: ShiftAssignment, def: ShiftDefinition }[] 
        }[] = [];

        const periodOrder: Record<string, number> = { 'Manhã': 1, 'Tarde': 2, 'Noite': 3, 'Legenda Especial': 4 };

        // Add vehicles
        vehicles.forEach(v => {
            const vStaff = dailyAssignments
                .filter(a => a.allocation?.type === 'VEHICLE' && a.allocation.id === v.id)
                .map(a => {
                    const emp = employees.find(e => e.id === a.employeeId);
                    const def = shiftDefs[a.shiftCode];
                    return (emp && def) ? { employee: emp, assignment: a, def } : null;
                })
                .filter((s): s is NonNullable<typeof s> => s !== null)
                .sort((a, b) => {
                    const orderA = periodOrder[a.def.category] || 99;
                    const orderB = periodOrder[b.def.category] || 99;
                    if (orderA !== orderB) return orderA - orderB;
                    return (a.employee.name || '').localeCompare(b.employee.name || '');
                });

            if (vStaff.length > 0) {
                result.push({
                    type: 'VEHICLE',
                    id: v.id,
                    name: `Viatura: ${v.code} - ${v.name}`,
                    staff: vStaff
                });
            }
        });

        // Add sectors
        sectors.forEach(s => {
            const sStaff = dailyAssignments
                .filter(a => a.allocation?.type === 'SECTOR' && a.allocation.id === s.id)
                .map(a => {
                    const emp = employees.find(e => e.id === a.employeeId);
                    const def = shiftDefs[a.shiftCode];
                    return (emp && def) ? { employee: emp, assignment: a, def } : null;
                })
                .filter((st): st is NonNullable<typeof st> => st !== null)
                .sort((a, b) => {
                    const orderA = periodOrder[a.def.category] || 99;
                    const orderB = periodOrder[b.def.category] || 99;
                    if (orderA !== orderB) return orderA - orderB;
                    return (a.employee.name || '').localeCompare(b.employee.name || '');
                });

            if (sStaff.length > 0) {
                result.push({
                    type: 'SECTOR',
                    id: s.id,
                    name: `Setor: ${s.name}`,
                    staff: sStaff
                });
            }
        });

        return result;
    }, [dailyAssignments, vehicles, sectors, employees, shiftDefs]);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.setTextColor(0, 86, 179);
        doc.text('Distribuição por Viaturas/Setores', 14, 20);
        
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        const [y, m, d] = selectedDate.split('-');
        doc.text(`Data: ${d}/${m}/${y}`, 14, 28);

        let currentY = 35;

        allocationsList.forEach(group => {
            if (group.staff.length === 0) return;

            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text(`${group.name} (${group.staff.length} profissionais)`, 14, currentY);
            currentY += 5;

            const tableData = group.staff.map(s => [
                s.employee.name,
                s.employee.matricula,
                s.employee.role,
                s.assignment.shiftCode
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [['Nome', 'Matrícula', 'Cargo', 'Turno']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: 'bold' },
                styles: { fontSize: 10 },
                margin: { left: 14, right: 14 },
            });

            currentY = (doc as any).lastAutoTable.finalY + 15;
            
            if (currentY > 270) {
                doc.addPage();
                currentY = 20;
            }
        });

        doc.save(`distribuicao_${selectedDate}.pdf`);
    };

    const handleExportCSV = () => {
        const headers = ['Locação', 'Tipo', 'Nome', 'Cargo', 'Matrícula', 'Turno'];
        const rows: string[] = [];

        allocationsList.forEach(group => {
            group.staff.forEach(s => {
                rows.push([
                    group.name.replace('Viatura: ', '').replace('Setor: ', ''),
                    group.type === 'VEHICLE' ? 'Viatura' : 'Setor',
                    s.employee.name,
                    s.employee.role,
                    s.employee.matricula,
                    s.assignment.shiftCode
                ].map(val => `"${val}"`).join(','));
            });
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `distribuicao_${selectedDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <MapPin className="text-gdf-primary" size={20} /> Distribuição (Viaturas/Setores)
                        </h3>
                        <p className="text-sm text-gray-500">Visualize servidores escalados por alocação local/veículo.</p>
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
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Período/Turno</label>
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
                                className="bg-white text-red-600 border border-red-200 px-4 py-2 rounded-md hover:bg-red-50 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                            >
                                <Download size={16} /> PDF
                            </button>
                            <button 
                                onClick={handleExportCSV}
                                className="bg-white text-green-600 border border-green-200 px-4 py-2 rounded-md hover:bg-green-50 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                            >
                                <Download size={16} /> CSV
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {allocationsList.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                            <Users size={32} className="mx-auto text-gray-300 mb-3" />
                            <h3 className="text-lg font-medium text-gray-900">Nenhuma alocação encontrada</h3>
                            <p className="text-gray-500 mt-1">
                                Não há servidores alocados em viaturas ou setores para esta data/turno.
                            </p>
                        </div>
                    ) : (
                        allocationsList.map(group => (
                            <div key={`${group.type}-${group.id}`} className="border rounded-lg overflow-hidden">
                                <h4 className="font-bold text-gray-700 bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        {group.type === 'VEHICLE' ? <Truck size={18} className="text-blue-500" /> : <MapPin size={18} className="text-green-500" />}
                                        {group.name}
                                    </div>
                                    <span className="text-sm font-normal text-gray-500 bg-white px-2 py-0.5 rounded-full border">{group.staff.length} profissionais</span>
                                </h4>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-white">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Servidor</th>
                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Matrícula</th>
                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Cargo</th>
                                                <th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">Turno/Legenda</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {group.staff.map((s, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-6 h-6 rounded-full ${s.employee.colorIdentifier} flex items-center justify-center text-white text-[10px] font-bold`}>
                                                                {s.employee.name.charAt(0)}
                                                            </div>
                                                            {s.employee.name}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-500">{s.employee.matricula}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{s.employee.role}</td>
                                                    <td className="px-4 py-3 text-sm text-center font-semibold text-blue-600">
                                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                                            {s.assignment.shiftCode}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AllocationReportView;
