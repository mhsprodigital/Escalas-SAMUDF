import { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    deleteDoc, 
    onSnapshot, 
    query, 
    where,
    writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Employee, ShiftAssignment, UnitStructure, ShiftDefinition, Vehicle, Sector } from '../types';
import { SHIFT_DEFINITIONS as DEFAULT_SHIFT_DEFINITIONS, LEGEND_GLOSSARY as DEFAULT_LEGEND_GLOSSARY } from '../constants';

// Error handling helper as per instructions
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const SETTINGS_DOC_ID = 'global_settings';

// Real-time listeners
export const subscribeToEmployees = (callback: (employees: Employee[]) => void) => {
    const q = collection(db, 'employees');
    return onSnapshot(q, (snapshot) => {
        const employees = snapshot.docs.map(doc => doc.data() as Employee);
        callback(employees);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'employees'));
};

export const subscribeToAssignments = (callback: (assignments: ShiftAssignment[]) => void) => {
    const q = collection(db, 'assignments');
    return onSnapshot(q, (snapshot) => {
        const assignments = snapshot.docs.map(doc => doc.data() as ShiftAssignment);
        callback(assignments);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'assignments'));
};

export const subscribeToSettings = (callback: (settings: any) => void) => {
    const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
    return onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data());
        } else {
            // Initialize default settings if not exists
            const defaults = {
                units: DEFAULT_UNITS,
                hours: [20, 30, 40],
                rulesTitle: 'Banco de Conhecimento - Portaria nº 321/2023',
                rulesDesc: 'Consulta de legendas e horários oficiais da SES-DF.',
                glossary: DEFAULT_LEGEND_GLOSSARY,
                shiftDefs: DEFAULT_SHIFT_DEFINITIONS
            };
            saveSettings(defaults);
            callback(defaults);
        }
    }, (error) => handleFirestoreError(error, OperationType.GET, `settings/${SETTINGS_DOC_ID}`));
};

export const subscribeToVehicles = (callback: (vehicles: Vehicle[]) => void) => {
    const q = collection(db, 'vehicles');
    return onSnapshot(q, (snapshot) => {
        const vehicles = snapshot.docs.map(doc => doc.data() as Vehicle);
        callback(vehicles);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'vehicles'));
};

export const subscribeToSectors = (callback: (sectors: Sector[]) => void) => {
    const q = collection(db, 'sectors');
    return onSnapshot(q, (snapshot) => {
        const sectors = snapshot.docs.map(doc => doc.data() as Sector);
        callback(sectors);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'sectors'));
};

const DEFAULT_UNITS: UnitStructure[] = [
    { id: '1', name: 'Hospital de Base (HBDF)', sectors: ['UTI Adulto', 'Pronto Socorro', 'Enfermaria A'] },
    { id: '2', name: 'Hospital Materno Infantil (HMIB)', sectors: ['Centro Obstétrico', 'Pediatria', 'Neonatologia'] },
    { id: '3', name: 'UBS 01 Asa Sul', sectors: ['Estratégia Saúde da Família', 'Sala de Vacina'] },
    { id: '4', name: 'UPA Núcleo Bandeirante', sectors: ['Classificação de Risco', 'Box de Emergência'] }
];

// CRUD Operations
export const saveEmployee = async (employee: Employee): Promise<void> => {
    try {
        await setDoc(doc(db, 'employees', employee.id), employee);
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `employees/${employee.id}`);
    }
};

export const deleteEmployee = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, 'employees', id));
        
        // Delete assignments for this employee
        const q = query(collection(db, 'assignments'), where('employeeId', '==', id));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `employees/${id}`);
    }
};

export const saveVehicle = async (vehicle: Vehicle): Promise<void> => {
    try {
        await setDoc(doc(db, 'vehicles', vehicle.id), vehicle);
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `vehicles/${vehicle.id}`);
    }
};

export const deleteVehicle = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, 'vehicles', id));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `vehicles/${id}`);
    }
};

export const saveSector = async (sector: Sector): Promise<void> => {
    try {
        await setDoc(doc(db, 'sectors', sector.id), sector);
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `sectors/${sector.id}`);
    }
};

export const deleteSector = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, 'sectors', id));
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `sectors/${id}`);
    }
};

export const saveAssignments = async (assignments: ShiftAssignment[]): Promise<void> => {
    try {
        // This is tricky because we might be saving a whole set. 
        // For performance, we should probably only save changed ones, 
        // but for now let's do a batch of what's provided.
        // Note: Firestore batch has a limit of 500 operations.
        const batch = writeBatch(db);
        assignments.forEach(a => {
            const ref = doc(db, 'assignments', a.id);
            batch.set(ref, a);
        });
        await batch.commit();
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'assignments');
    }
};

export const saveSettings = async (settings: any): Promise<void> => {
    try {
        await setDoc(doc(db, 'settings', SETTINGS_DOC_ID), settings);
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `settings/${SETTINGS_DOC_ID}`);
    }
};

export const getSettings = async (): Promise<any> => {
    const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
        return snapshot.data();
    }
    return null;
};

export const getShiftDefinitions = async (): Promise<Record<string, ShiftDefinition>> => {
    const settings = await getSettings();
    return settings?.shiftDefs || DEFAULT_SHIFT_DEFINITIONS;
};

export const getUnits = async (): Promise<UnitStructure[]> => {
    const settings = await getSettings();
    return settings?.units || DEFAULT_UNITS;
};

export const getContractHoursOptions = async (): Promise<number[]> => {
    const settings = await getSettings();
    return settings?.hours || [20, 30, 40];
};

export const getRulesTitle = async (): Promise<string> => {
    const settings = await getSettings();
    return settings?.rulesTitle || '';
};

export const getRulesDesc = async (): Promise<string> => {
    const settings = await getSettings();
    return settings?.rulesDesc || '';
};

export const getGlossary = async (): Promise<Record<string, string>> => {
    const settings = await getSettings();
    return settings?.glossary || DEFAULT_LEGEND_GLOSSARY;
};

// Legacy getters (will be replaced by real-time in components)
export const getEmployees = async (): Promise<Employee[]> => {
    const snapshot = await getDocs(collection(db, 'employees'));
    return snapshot.docs.map(doc => doc.data() as Employee);
};

export const getAssignments = async (): Promise<ShiftAssignment[]> => {
    const snapshot = await getDocs(collection(db, 'assignments'));
    return snapshot.docs.map(doc => doc.data() as ShiftAssignment);
};
