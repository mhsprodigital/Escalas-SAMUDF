import React, { useState, useMemo, useEffect } from 'react';
import { BookOpen, Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import { ShiftDefinition } from '../types';
import { subscribeToSettings, saveSettings } from '../services/storageService';

interface SettingsData {
    rulesTitle: string;
    rulesDesc: string;
    glossary: Record<string, string>;
    shiftDefs: Record<string, ShiftDefinition>;
    units: string[];
    contractHoursOptions: number[];
}

const RulesView: React.FC = () => {
    const [settings, setSettings] = useState<SettingsData | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // Local form states
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [glossary, setGlossary] = useState<Record<string, string>>({});
    const [definitions, setDefinitions] = useState<Record<string, ShiftDefinition>>({});

    // Form states for new/edit
    const [editingGlossaryKey, setEditingGlossaryKey] = useState<string | null>(null);
    const [glossaryForm, setGlossaryForm] = useState({ key: '', value: '' });

    const [editingDefKey, setEditingDefKey] = useState<string | null>(null);
    const [defForm, setDefForm] = useState<ShiftDefinition>({
        code: '', label: '', start: '', end: '', hours: 0, category: 'Manhã'
    });

    useEffect(() => {
        const unsub = subscribeToSettings((data: any) => {
            if (!data) return;
            const settingsData = data as SettingsData;
            setSettings(settingsData);
            if (!isEditing) {
                setTitle(settingsData.rulesTitle || '');
                setDesc(settingsData.rulesDesc || '');
                setGlossary(settingsData.glossary || {});
                setDefinitions(settingsData.shiftDefs || {});
            }
        });
        return () => unsub();
    }, [isEditing]);

    // Group definitions for display
    const groupedDefinitions = useMemo<Record<string, Record<string, ShiftDefinition>>>(() => {
        const groups: Record<string, Record<string, ShiftDefinition>> = {};
        
        // Initialize groups in desired order
        const groupOrder = [
            "Ambulatório",
            "Centro Cirúrgico",
            "Enfermaria",
            "Pronto Socorro",
            "Serviço",
            "Geral (Administrativo)",
            "Afastamentos & Licenças",
            "Banco de Horas",
            "Atividades Externas & Cessão",
            "Legendas Especiais"
        ];
        groupOrder.forEach(g => groups[g] = {});

        Object.values(definitions).forEach((def: ShiftDefinition) => {
            if (!def || !def.code) return;
            let type = "Geral (Administrativo)";
            if (def.category === 'Legenda Especial') type = "Legendas Especiais";
            else if (def.category === 'Afastamento') type = "Afastamentos & Licenças";
            else if (def.category === 'Atividade Não Assistencial') type = "Atividades Externas & Cessão";
            else if (def.code.startsWith('AM') || def.code.startsWith('AT') || def.code.startsWith('AN')) type = "Ambulatório";
            else if (def.code.startsWith('CM') || def.code.startsWith('CT') || def.code.startsWith('CN')) type = "Centro Cirúrgico";
            else if (def.code.startsWith('EM') || def.code.startsWith('ET') || def.code.startsWith('EN')) type = "Enfermaria";
            else if (def.code.startsWith('PM') || def.code.startsWith('PT') || def.code.startsWith('PN')) type = "Pronto Socorro";
            else if (def.code.startsWith('SM') || def.code.startsWith('ST') || def.code.startsWith('SN')) type = "Serviço";
            else if (def.category === 'Banco de Horas') type = "Banco de Horas";
            
            if (def.code === 'BLK') type = "Afastamentos & Licenças";

            if (!groups[type]) groups[type] = {};
            groups[type][def.code] = def;
        });

        // Remove empty groups
        Object.keys(groups).forEach(k => {
            if (Object.keys(groups[k]).length === 0) delete groups[k];
        });

        return groups;
    }, [definitions]);

    if (!settings) return <div className="p-8 text-center text-gray-500">Carregando regras...</div>;

    const handleSaveAll = async () => {
        await saveSettings({
            ...settings,
            rulesTitle: title,
            rulesDesc: desc,
            glossary: glossary,
            shiftDefs: definitions
        });
        setIsEditing(false);
    };

    // --- Glossary Actions ---
    const handleSaveGlossaryItem = () => {
        if (!glossaryForm.key || !glossaryForm.value) return;
        
        const newGlossary = { ...glossary };
        if (editingGlossaryKey && editingGlossaryKey !== glossaryForm.key) {
            delete newGlossary[editingGlossaryKey];
        }
        newGlossary[glossaryForm.key] = glossaryForm.value;
        setGlossary(newGlossary);
        setEditingGlossaryKey(null);
        setGlossaryForm({ key: '', value: '' });
    };

    const handleDeleteGlossaryItem = (key: string) => {
        const newGlossary = { ...glossary };
        delete newGlossary[key];
        setGlossary(newGlossary);
    };

    // --- Definition Actions ---
    const handleSaveDefItem = () => {
        if (!defForm.code || !defForm.start || !defForm.end || isNaN(defForm.hours)) return;
        
        const newDefs = { ...definitions };
        if (editingDefKey && editingDefKey !== defForm.code) {
            delete newDefs[editingDefKey];
        }
        
        // Auto-fill label if empty
        const finalDef = { ...defForm, label: defForm.label || defForm.code };
        newDefs[finalDef.code] = finalDef;
        
        setDefinitions(newDefs);
        setEditingDefKey(null);
        setDefForm({ code: '', label: '', start: '', end: '', hours: 0, category: 'Legenda Especial' });
    };

    const handleDeleteDefItem = (code: string) => {
        const newDefs = { ...definitions };
        delete newDefs[code];
        setDefinitions(newDefs);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100">
                <div className="flex justify-between items-start mb-6">
                    <div className="border-l-4 border-gdf-primary pl-4 flex-1">
                        {isEditing ? (
                            <div className="space-y-2 max-w-2xl">
                                <input 
                                    type="text" 
                                    value={title} 
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full text-2xl font-bold text-gray-800 border-b border-gray-300 focus:border-gdf-primary focus:outline-none px-1 py-1"
                                    placeholder="Título do Banco de Conhecimento"
                                />
                                <input 
                                    type="text" 
                                    value={desc} 
                                    onChange={e => setDesc(e.target.value)}
                                    className="w-full text-gray-500 border-b border-gray-300 focus:border-gdf-primary focus:outline-none px-1 py-1"
                                    placeholder="Descrição..."
                                />
                            </div>
                        ) : (
                            <>
                                <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                                <p className="text-gray-500">{desc}</p>
                            </>
                        )}
                    </div>
                    <div>
                        {isEditing ? (
                            <div className="flex gap-2">
                                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-2 transition">
                                    <X size={16} /> Cancelar
                                </button>
                                <button onClick={handleSaveAll} className="px-4 py-2 text-white bg-gdf-primary hover:bg-blue-700 rounded flex items-center gap-2 transition shadow-sm">
                                    <Save size={16} /> Salvar Alterações
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setIsEditing(true)} className="px-4 py-2 text-gdf-primary bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded flex items-center gap-2 transition shadow-sm font-medium">
                                <Edit2 size={16} /> Editar Regras
                            </button>
                        )}
                    </div>
                </div>

                {/* Glossary Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-blue-800 text-lg">Glossário de Siglas</h3>
                        {isEditing && !editingGlossaryKey && (
                            <button 
                                onClick={() => { setEditingGlossaryKey('NEW'); setGlossaryForm({ key: '', value: '' }); }}
                                className="text-xs bg-white text-blue-600 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100 flex items-center gap-1"
                            >
                                <Plus size={14}/> Adicionar Sigla
                            </button>
                        )}
                    </div>

                    {isEditing && editingGlossaryKey === 'NEW' && (
                        <div className="bg-white p-3 rounded border border-blue-300 mb-4 flex gap-2 items-start shadow-sm">
                            <input 
                                type="text" placeholder="Sigla (ex: M)" className="border p-2 rounded w-32 text-sm"
                                value={glossaryForm.key} onChange={e => setGlossaryForm({...glossaryForm, key: e.target.value})}
                            />
                            <input 
                                type="text" placeholder="Significado (ex: Manhã)" className="border p-2 rounded flex-1 text-sm"
                                value={glossaryForm.value} onChange={e => setGlossaryForm({...glossaryForm, value: e.target.value})}
                            />
                            <button onClick={handleSaveGlossaryItem} className="bg-green-500 text-white p-2 rounded hover:bg-green-600"><Save size={16}/></button>
                            <button onClick={() => setEditingGlossaryKey(null)} className="bg-gray-200 text-gray-600 p-2 rounded hover:bg-gray-300"><X size={16}/></button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(glossary).map(([key, value]) => (
                            <div key={key} className="flex flex-col gap-1">
                                {isEditing && editingGlossaryKey === key ? (
                                    <div className="bg-white p-2 rounded border border-blue-300 flex gap-2 items-start shadow-sm">
                                        <input 
                                            type="text" className="border p-1 rounded w-20 text-xs font-bold"
                                            value={glossaryForm.key} onChange={e => setGlossaryForm({...glossaryForm, key: e.target.value})}
                                        />
                                        <input 
                                            type="text" className="border p-1 rounded flex-1 text-xs"
                                            value={glossaryForm.value} onChange={e => setGlossaryForm({...glossaryForm, value: e.target.value})}
                                        />
                                        <button onClick={handleSaveGlossaryItem} className="text-green-600 hover:bg-green-50 p-1 rounded"><Save size={14}/></button>
                                        <button onClick={() => setEditingGlossaryKey(null)} className="text-gray-500 hover:bg-gray-100 p-1 rounded"><X size={14}/></button>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-3 group relative">
                                        <span className="font-bold bg-white px-2 py-1 rounded border border-blue-200 text-blue-700 min-w-[3.5rem] text-center text-sm shadow-sm">{key}</span>
                                        <span className="text-sm text-gray-700 leading-tight pt-1 flex-1">{value}</span>
                                        
                                        {isEditing && (
                                            <div className="opacity-0 group-hover:opacity-100 absolute right-0 top-0 bg-blue-50 flex gap-1 p-1 rounded shadow-sm border border-blue-100 transition-opacity">
                                                <button onClick={() => { setEditingGlossaryKey(key); setGlossaryForm({ key, value }); }} className="text-blue-600 hover:bg-blue-100 p-1 rounded"><Edit2 size={12}/></button>
                                                <button onClick={() => handleDeleteGlossaryItem(key)} className="text-red-500 hover:bg-red-100 p-1 rounded"><Trash2 size={12}/></button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Definitions Section */}
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800 text-lg">Legendas de Plantão</h3>
                    {isEditing && !editingDefKey && (
                        <button 
                            onClick={() => { 
                                setEditingDefKey('NEW'); 
                                setDefForm({ code: '', label: '', start: '', end: '', hours: 0, category: 'Legenda Especial' }); 
                            }}
                            className="text-sm bg-gdf-primary text-white px-3 py-1.5 rounded hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                        >
                            <Plus size={16}/> Nova Legenda
                        </button>
                    )}
                </div>

                {isEditing && editingDefKey === 'NEW' && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-300 mb-6 shadow-sm">
                        <h4 className="font-bold text-gray-700 mb-3 text-sm border-b pb-2">Adicionar Nova Legenda</h4>
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                            <div className="col-span-1">
                                <label className="block text-xs text-gray-500 mb-1">Código</label>
                                <input type="text" placeholder="Ex: M8" className="w-full border p-2 rounded text-sm" value={defForm.code} onChange={e => setDefForm({...defForm, code: e.target.value.toUpperCase()})} />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs text-gray-500 mb-1">Início</label>
                                <input type="time" className="w-full border p-2 rounded text-sm" value={defForm.start} onChange={e => setDefForm({...defForm, start: e.target.value})} />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs text-gray-500 mb-1">Fim</label>
                                <input type="time" className="w-full border p-2 rounded text-sm" value={defForm.end} onChange={e => setDefForm({...defForm, end: e.target.value})} />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs text-gray-500 mb-1">Horas</label>
                                <input type="number" className="w-full border p-2 rounded text-sm" value={defForm.hours} onChange={e => setDefForm({...defForm, hours: Number(e.target.value)})} />
                                <span className="text-[9px] text-gray-400 leading-tight block mt-1">Valores negativos para banco negativo</span>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs text-gray-500 mb-1">Turno/Categoria</label>
                                <select className="w-full border p-2 rounded text-sm bg-white" value={defForm.category} onChange={e => setDefForm({...defForm, category: e.target.value})}>
                                    <option value="Manhã">Manhã</option>
                                    <option value="Tarde">Tarde</option>
                                    <option value="Noite">Noite</option>
                                    <option value="Afastamento">Afastamento</option>
                                    <option value="Bloqueio">Bloqueio</option>
                                    <option value="Legenda Especial">Legenda Especial</option>
                                    <option value="Banco de Horas">Banco de Horas</option>
                                    <option value="Atividade Não Assistencial">Atividade Não Assistencial</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <button onClick={() => setEditingDefKey(null)} className="px-3 py-1.5 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded text-sm">Cancelar</button>
                            <button onClick={handleSaveDefItem} className="px-3 py-1.5 text-white bg-green-500 hover:bg-green-600 rounded text-sm flex items-center gap-1"><Save size={14}/> Salvar</button>
                        </div>
                    </div>
                )}

                <div className="space-y-8">
                    {Object.entries(groupedDefinitions).map(([group, defs]) => (
                        <div key={group} className="border rounded-lg overflow-hidden">
                            <div className="bg-gray-100 px-4 py-2 font-bold text-gray-800 uppercase tracking-wide border-b">
                                {group}
                            </div>
                            <div className="bg-white p-0 overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Legenda</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Horário</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Duração</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Turno</th>
                                            {isEditing && <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Ações</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {Object.values(defs).sort((a,b) => a.hours - b.hours).map((def) => (
                                            <tr key={def.code} className="hover:bg-gray-50 group">
                                                {isEditing && editingDefKey === def.code ? (
                                                    <td colSpan={5} className="p-3 bg-blue-50">
                                                        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
                                                            <div className="col-span-1">
                                                                <label className="block text-[10px] text-gray-500 mb-1">Código</label>
                                                                <input type="text" className="w-full border p-1.5 rounded text-xs font-mono font-bold" value={defForm.code} onChange={e => setDefForm({...defForm, code: e.target.value.toUpperCase()})} />
                                                            </div>
                                                            <div className="col-span-1">
                                                                <label className="block text-[10px] text-gray-500 mb-1">Início</label>
                                                                <input type="time" className="w-full border p-1.5 rounded text-xs" value={defForm.start} onChange={e => setDefForm({...defForm, start: e.target.value})} />
                                                            </div>
                                                            <div className="col-span-1">
                                                                <label className="block text-[10px] text-gray-500 mb-1">Fim</label>
                                                                <input type="time" className="w-full border p-1.5 rounded text-xs" value={defForm.end} onChange={e => setDefForm({...defForm, end: e.target.value})} />
                                                            </div>
                                                            <div className="col-span-1">
                                                                <label className="block text-[10px] text-gray-500 mb-1">Horas</label>
                                                                <input type="number" className="w-full border p-1.5 rounded text-xs" value={defForm.hours} onChange={e => setDefForm({...defForm, hours: Number(e.target.value)})} />
                                                                <span className="text-[9px] text-gray-400 leading-tight block mt-1">Valores negativos para banco negativo</span>
                                                            </div>
                                                            <div className="col-span-1 md:col-span-1">
                                                                <label className="block text-[10px] text-gray-500 mb-1">Turno</label>
                                                                <select className="w-full border p-1.5 rounded text-xs bg-white" value={defForm.category} onChange={e => setDefForm({...defForm, category: e.target.value})}>
                                                                    <option value="Manhã">Manhã</option>
                                                                    <option value="Tarde">Tarde</option>
                                                                    <option value="Noite">Noite</option>
                                                                    <option value="Afastamento">Afastamento</option>
                                                                    <option value="Bloqueio">Bloqueio</option>
                                                                    <option value="Legenda Especial">Legenda Especial</option>
                                                                    <option value="Banco de Horas">Banco de Horas</option>
                                                                    <option value="Atividade Não Assistencial">Atividade Não Assistencial</option>
                                                                </select>
                                                            </div>
                                                            <div className="col-span-2 md:col-span-1 flex justify-end gap-1 pb-0.5">
                                                                <button onClick={handleSaveDefItem} className="p-1.5 text-white bg-green-500 hover:bg-green-600 rounded"><Save size={14}/></button>
                                                                <button onClick={() => setEditingDefKey(null)} className="p-1.5 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded"><X size={14}/></button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                ) : (
                                                    <>
                                                        <td className="px-4 py-2 text-sm font-mono font-bold text-blue-700">{def.code}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-700">{def.start} às {def.end}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-600">{def.hours}h</td>
                                                        <td className="px-4 py-2 text-sm">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold
                                                                ${def.category === 'Manhã' ? 'bg-yellow-100 text-yellow-800' : 
                                                                def.category === 'Tarde' ? 'bg-blue-100 text-blue-800' :
                                                                def.category === 'Noite' ? 'bg-indigo-100 text-indigo-800' : 
                                                                'bg-gray-100 text-gray-600'}`}>
                                                                {def.category}
                                                            </span>
                                                        </td>
                                                        {isEditing && (
                                                            <td className="px-4 py-2 text-right">
                                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => { setEditingDefKey(def.code); setDefForm(def); }} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit2 size={16}/></button>
                                                                    <button onClick={() => handleDeleteDefItem(def.code)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                                                                </div>
                                                            </td>
                                                        )}
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RulesView;
