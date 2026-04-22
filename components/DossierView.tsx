import React, { useState, useMemo } from 'react';
import { Employee, ShiftAssignment, ShiftDefinition } from '../types';
import { Search, FileText, UserSquare, Calendar, ChevronDown, ChevronRight, FileDigit } from 'lucide-react';

interface DossierViewProps {
    employees: Employee[];
    assignments: ShiftAssignment[];
    shiftDefs: Record<string, ShiftDefinition>;
}

const DossierView: React.FC<DossierViewProps> = ({ employees, assignments, shiftDefs }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const filteredEmployees = useMemo(() => {
        return employees
            .filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.role.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [employees, searchTerm]);

    const selectedEmployee = useMemo(() => {
        return employees.find(e => e.id === selectedEmployeeId);
    }, [employees, selectedEmployeeId]);

    const employeeEvents = useMemo(() => {
        if (!selectedEmployeeId) return [];

        return assignments
            .filter(a => {
                if (a.employeeId !== selectedEmployeeId) return false;
                const def = shiftDefs[a.shiftCode];
                const category = a.category || def?.category;
                // Ignorar turnos regulares
                if (['Manhã', 'Tarde', 'Noite'].includes(category || '')) return false;
                // Ignorar bloqueios na contagem se for apenas 'BLK', mas talvez interessem? Melhor deixar ou remover? 
                // Se for só BLK sem SEI, podemos remover para não poluir. Mas como a regra engloba "tudo que não é serviço", vamos deixá-los.
                // Na verdade, bloqueios são técnicos. Vamos ignorá-los se não tiverem processo SEI para focar no servidor.
                if (a.shiftCode === 'BLK' && !a.seiProcess) return false;
                return true;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [assignments, selectedEmployeeId, shiftDefs]);

    const toggleRow = (eventId: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(eventId)) {
            newExpanded.delete(eventId);
        } else {
            newExpanded.add(eventId);
        }
        setExpandedRows(newExpanded);
    };

    return (
        <div className="flex flex-col md:flex-row h-full gap-4 bg-gray-50">
            {/* Sidebar List */}
            <div className="w-full md:w-80 flex flex-col bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Servidores</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar servidor..."
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded focus:ring-2 focus:ring-gdf-primary focus:outline-none text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {filteredEmployees.map(emp => (
                        <button
                            key={emp.id}
                            onClick={() => setSelectedEmployeeId(emp.id)}
                            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors mb-1 ${selectedEmployeeId === emp.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'hover:bg-gray-50 border-transparent'}`}
                        >
                             <div className={`flex-shrink-0 h-10 w-10 rounded-full ${emp.colorIdentifier} flex items-center justify-center text-white text-sm font-bold shadow-sm`}>
                                {emp.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={`text-sm font-semibold truncate ${selectedEmployeeId === emp.id ? 'text-blue-900' : 'text-gray-800'}`}>{emp.name}</div>
                                <div className="text-xs text-gray-500 truncate">{emp.role}</div>
                            </div>
                        </button>
                    ))}
                    {filteredEmployees.length === 0 && (
                        <div className="text-center p-4 text-gray-500 text-sm">Nenhum servidor encontrado.</div>
                    )}
                </div>
            </div>

            {/* Dossier Details View */}
            <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                {selectedEmployee ? (
                    <>
                        <div className="p-6 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                     <div className={`h-16 w-16 rounded-full ${selectedEmployee.colorIdentifier} flex items-center justify-center text-white text-2xl font-bold shadow-sm`}>
                                        {selectedEmployee.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedEmployee.name}</h2>
                                        <p className="text-gray-600 font-medium">{selectedEmployee.role}</p>
                                    </div>
                                </div>
                                <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-right">
                                    <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Carga Horária</div>
                                    <div className="text-lg font-bold text-gray-800">{selectedEmployee.contractHours}h <span className="text-sm font-normal opacity-75">semanais</span></div>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <UserSquare size={14} /> Detalhes Funcionais e Contato
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Matrícula:</span>
                                            <span className="font-medium text-gray-900">{selectedEmployee.matricula || 'Não informada'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Registro Profissional:</span>
                                            <span className="font-medium text-gray-900">{selectedEmployee.coren || 'Não informado'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">CNES:</span>
                                            <span className="font-medium text-gray-900">{selectedEmployee.cnes || 'Não informado'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Contato:</span>
                                            <span className="font-medium text-gray-900">{selectedEmployee.contact || 'Não informado'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Tipo de Vínculo:</span>
                                            <span className="font-medium text-gray-900">{selectedEmployee.bond || selectedEmployee.employmentType || 'Não informado'}</span>
                                        </div>
                                        {(selectedEmployee.bond === 'Temporário' || selectedEmployee.employmentType === 'Temporário') && selectedEmployee.contractExpiry && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Término do Contrato:</span>
                                                <span className="font-medium text-red-600">{new Date(selectedEmployee.contractExpiry).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Restrições Gerais:</span>
                                            <span className="font-medium text-gray-900">{selectedEmployee.restrictions || 'Nenhuma'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <UserSquare size={14} /> Preferências e Restrições de Escala
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Redução de Carga Horária:</span>
                                            <span className="font-medium text-gray-900">{selectedEmployee.preferences?.reducaoCarga > 0 ? `${selectedEmployee.preferences.reducaoCarga}h` : 'Não'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Período Preferencial:</span>
                                            <span className="font-medium text-gray-900">{selectedEmployee.preferences?.periodoPreferencial || 'INDIFERENTE'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Preferência por Finais de Semana:</span>
                                            <span className="font-medium text-gray-900">{selectedEmployee.preferences?.prefersWeekends ? 'Sim' : 'Não'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Tipo de Atuação:</span>
                                            <span className="font-medium text-gray-900">{selectedEmployee.preferences?.tipoAtuacao || 'TOTAL'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto bg-white p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FileText size={20} className="text-gdf-primary" />
                                Histórico de Eventos e Afastamentos
                            </h3>
                            
                            {employeeEvents.length > 0 ? (
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-8"></th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Data</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Evento / Legenda</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Processo SEI</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {employeeEvents.map(event => {
                                                const def = shiftDefs[event.shiftCode];
                                                const isExpanded = expandedRows.has(event.id);
                                                return (
                                                    <React.Fragment key={event.id}>
                                                        <tr onClick={() => toggleRow(event.id)} className="hover:bg-gray-50 cursor-pointer">
                                                            <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                                                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                {new Date(event.date).toLocaleDateString('pt-BR')}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                <span className="inline-flex items-center gap-1.5 font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                                                    {event.isManualLock ? 'Bloqueio' : event.shiftCode}
                                                                </span>
                                                                {def && <span className="ml-2 text-xs text-gray-400">({def.label})</span>}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {event.seiProcess ? (
                                                                    <div className="flex items-center gap-2 text-blue-600">
                                                                        <FileDigit size={16} />
                                                                        <span>{event.seiProcess}</span>
                                                                        <button 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                navigator.clipboard.writeText(event.seiProcess!);
                                                                                alert('SEI copiado!');
                                                                            }} 
                                                                            className="text-gray-400 hover:text-blue-600 transition-colors bg-white hover:bg-blue-50 border p-1 rounded"
                                                                            title="Copiar SEI"
                                                                        >
                                                                            <FileText size={14} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-300">-</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <tr className="bg-blue-50/50">
                                                                <td colSpan={4} className="px-6 py-4 border-b border-gray-100">
                                                                    <div className="text-sm text-gray-600 pl-8">
                                                                        <strong>Categoria:</strong> {event.category || def?.category || 'Desconhecida'} <br />
                                                                        {def?.hours !== undefined && (
                                                                             <><strong>Horas Computadas:</strong> {def.hours}h <br /></>
                                                                        )}
                                                                        <strong>Registrado por:</strong> Sistema
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                    <Calendar size={48} className="mx-auto mb-3 text-gray-300" />
                                    <p className="text-gray-500 font-medium">Nenhum evento registrado para este servidor.</p>
                                    <p className="text-sm text-gray-400 mt-1">Afastamentos, licenças e legendas especiais aparecerão aqui.</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                        <FileText size={64} className="mb-4 opacity-20" />
                        <h3 className="text-lg font-medium text-gray-500 mb-2">Selecione um Servidor</h3>
                        <p className="text-center max-w-md">
                            Escolha um servidor na lista lateral para visualizar seu dossiê completo, incluindo informações funcionais e histórico de eventos.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DossierView;
