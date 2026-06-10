const isShiftInPeriod = (shiftCode: string, cat: string, checkPeriod: 'Manhã'|'Tarde'|'Noite'): boolean => {
    let isM = cat === 'Manhã';
    let isT = cat === 'Tarde';
    let isN = cat === 'Noite';

    if (cat === 'Legenda Especial' || cat === 'Banco de Horas' || shiftCode.includes('ST6 SN12') || shiftCode.includes('SM6 ST6')) {
        if (shiftCode.includes('SM6 ST6')) {
             isM = true; isT = true;
        } else if (shiftCode.includes('ST6 SN12')) {
             isT = true; isN = true;
        } else {
             if (shiftCode.match(/SM|\bM\b/)) isM = true;
             if (shiftCode.match(/ST|\bT\b/)) isT = true;
             if (shiftCode.match(/SN|\bN\b/)) isN = true;
        }
    }
    
    if (checkPeriod === 'Manhã') return isM;
    if (checkPeriod === 'Tarde') return isT;
    if (checkPeriod === 'Noite') return isN;
    return false;
};

const codes = ["TPD SM6", "TPD ST6", "TPD SM6 ST6", "TPD SN12"];
for (const code of codes) {
    console.log(code, 'M:', isShiftInPeriod(code, 'Legenda Especial', 'Manhã'), 'T:', isShiftInPeriod(code, 'Legenda Especial', 'Tarde'), 'N:', isShiftInPeriod(code, 'Legenda Especial', 'Noite'));
}
