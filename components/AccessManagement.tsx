import React, { useState, useEffect } from 'react';
import { SystemUser, UserRole, UnitStructure } from '../types';
import { subscribeToSystemUsers, saveSystemUser, deleteSystemUser, subscribeToSettings } from '../services/storageService';
import { Shield, UserPlus, Trash2, Mail, User as UserIcon, CheckCircle, AlertCircle, Edit2, X, Building2 } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

const AccessManagement: React.FC = () => {
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [units, setUnits] = useState<UnitStructure[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState<UserRole>('ADMIN');
    const [newUnitAccess, setNewUnitAccess] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    
    const [editingEmail, setEditingEmail] = useState<string | null>(null);
    const [editRole, setEditRole] = useState<UserRole>('VIEWER');
    const [editUnitAccess, setEditUnitAccess] = useState<string>('');

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {}
    });

    useEffect(() => {
        const unsubscribeUsers = subscribeToSystemUsers((data) => {
            setUsers(data);
        });
        const unsubscribeSettings = subscribeToSettings((data) => {
            if (data?.units) setUnits(data.units);
        });
        return () => {
            unsubscribeUsers();
            unsubscribeSettings();
        };
    }, []);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim()) return;

        setIsLoading(true);
        setMessage(null);

        try {
            const newUser: SystemUser = {
                uid: 'TBD', // This will be updated when user logs in, but we use email as key
                email: newEmail.toLowerCase().trim(),
                displayName: newName.trim() || 'Usuário Convidado',
                role: newRole,
                unitAccess: newUnitAccess || undefined,
                createdAt: new Date().toISOString()
            };

            await saveSystemUser(newUser);
            setNewEmail('');
            setNewName('');
            setNewUnitAccess('');
            setMessage({ text: 'Acesso liberado com sucesso!', type: 'success' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Erro ao adicionar usuário:', error);
            setMessage({ text: 'Erro ao liberar acesso. Verifique suas permissões.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = (email: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Remover Acesso',
            message: `Deseja realmente remover o acesso de ${email}?`,
            onConfirm: async () => {
                try {
                    await deleteSystemUser(email);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    console.error('Erro ao deletar usuário:', error);
                    // Standard message for UI consistency
                    setMessage({ text: 'Erro ao excluir acesso.', type: 'error' });
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleStartEdit = (user: SystemUser) => {
        setEditingEmail(user.email);
        setEditRole(user.role);
        setEditUnitAccess(user.unitAccess || '');
    };

    const handleSaveEdit = async (user: SystemUser) => {
        setIsLoading(true);
        try {
            const updatedUser: SystemUser = {
                ...user,
                role: editRole,
                unitAccess: editUnitAccess || undefined
            };
            await saveSystemUser(updatedUser);
            setEditingEmail(null);
            setMessage({ text: 'Acesso alterado com sucesso!', type: 'success' });
            setTimeout(() => setMessage(null), 3000);
        } catch(error) {
            console.error('Erro ao editar usuário', error);
            alert('Erro ao editar acesso.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gdf-primary p-6 text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Shield size={24} />
                        Gestão de Acessos Administrativos
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">
                        Libere e-mails específicos para gerenciar as escalas e o cadastro de servidores.
                    </p>
                </div>

                <div className="p-6">
                    <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail (Google)</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    required
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="exemplo@gmail.com"
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gdf-primary focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome/Identificação</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Chefe da Unidade X"
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gdf-primary focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nível de Acesso</label>
                            <select
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value as UserRole)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gdf-primary focus:outline-none"
                            >
                                <option value="ADMIN">Administrador (Total)</option>
                                <option value="EDITOR">Editor (Pode alterar escalas)</option>
                                <option value="VIEWER">Observador (Apenas leitura)</option>
                            </select>
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Building2 size={12}/> Núcleo (Acesso)</label>
                            <select
                                value={newUnitAccess}
                                onChange={(e) => setNewUnitAccess(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gdf-primary focus:outline-none"
                            >
                                <option value="">Todos (Acesso Global)</option>
                                {units.map(u => (
                                    <option key={u.id} value={u.name}>{u.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-1">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gdf-secondary text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition flex items-center justify-center gap-2 font-bold shadow-sm disabled:opacity-50"
                            >
                                <UserPlus size={18} />
                                {isLoading ? 'Processando...' : 'Liberar Acesso'}
                            </button>
                        </div>
                    </form>

                    {message && (
                        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            {message.text}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-700">Contas com Acesso Especial</h3>
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{users.length} usuários</span>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Usuário</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Nível</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Núcleo</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Data Liberação</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.email} className="hover:bg-blue-50/50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-gray-900">{user.displayName}</div>
                                        <div className="text-xs text-gray-500">{user.email}</div>
                                    </td>
                                    {editingEmail === user.email ? (
                                        <>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <select
                                                    value={editRole}
                                                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                                                    className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gdf-primary"
                                                >
                                                    <option value="ADMIN">Administrador</option>
                                                    <option value="EDITOR">Editor</option>
                                                    <option value="VIEWER">Observador</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <select
                                                    value={editUnitAccess}
                                                    onChange={(e) => setEditUnitAccess(e.target.value)}
                                                    className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gdf-primary"
                                                >
                                                    <option value="">Todos</option>
                                                    {units.map(u => (
                                                        <option key={u.id} value={u.name}>{u.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                                                <button onClick={() => setEditingEmail(null)} className="text-gray-500 hover:text-gray-700 bg-gray-100 p-2 rounded-full"><X size={16} /></button>
                                                <button onClick={() => handleSaveEdit(user)} className="text-green-600 hover:text-green-800 bg-green-50 p-2 rounded-full"><CheckCircle size={16} /></button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                                                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 
                                                    user.role === 'EDITOR' ? 'bg-blue-100 text-blue-700' : 
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {user.unitAccess ? <span className="font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded">{user.unitAccess}</span> : <span className="text-gray-400 italic">Todos</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                {user.email !== 'mhs.pro.digital@gmail.com' && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleStartEdit(user)}
                                                            className="text-gray-400 hover:text-blue-500 transition-colors p-2 rounded-full hover:bg-blue-50 mr-2"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(user.email)}
                                                            className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic">
                                        Nenhum usuário administrativo cadastrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl">
                <h4 className="text-amber-800 font-bold mb-2 flex items-center gap-2">
                    <AlertCircle size={20} />
                    Regras Importantes
                </h4>
                <ul className="text-sm text-amber-700 space-y-2 list-disc list-inside">
                    <li>Apenas e-mails do Google (Gmail ou Workspace) são compatíveis com o login.</li>
                    <li>O cargo <b>Administrador</b> permite gerenciar outros usuários e configurações globais.</li>
                    <li>Usuários não listados acima poderão logar no sistema, mas terão apenas acesso de <b>Leitura</b>.</li>
                    <li>Certifique-se de que o e-mail está escrito corretamente, sem espaços extras.</li>
                </ul>
            </div>

            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
};

export default AccessManagement;
