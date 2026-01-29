// src/lib/node-colors.ts

export const getNodeColor = (type: string): string => {
    switch (type) {
        // --- 1. GENERAL (Indigo) ---
        case 'Concept':
        case 'Object':
            return '#6366f1'; // Indigo-500
        
        // --- 2. LEGAL (Red) ---
        case 'Contract':
        case 'Statute':
        case 'Regulation':
        case 'Policy':
            return '#ef4444'; // Red-500
        case 'Clause':
        case 'Violation':
            return '#b91c1c'; // Red-700
            
        // --- 3. FINANCIAL (Emerald) ---
        case 'Company':
        case 'Organization':
            return '#10b981'; // Emerald-500
        case 'Asset':
        case 'Metric':
        case 'Currency':
            return '#047857'; // Emerald-700
        case 'Risk':
            return '#fbbf24'; // Amber-400

        // --- 4. MEDICAL (Cyan) ---
        case 'Patient':
        case 'Person':
            return '#3b82f6'; // Blue-500
        case 'Symptom':
        case 'Condition':
            return '#06b6d4'; // Cyan-500
        case 'Drug':
        case 'Treatment':
            return '#0891b2'; // Cyan-600

        // --- 5. ENGINEERING (Violet) ---
        case 'System':
        case 'Component':
            return '#8b5cf6'; // Violet-500
        case 'API':
        case 'Function':
        case 'Class':
            return '#7c3aed'; // Violet-600
        
        // --- 6. SALES (Orange) ---
        case 'Client':
        case 'Competitor':
            return '#f97316'; // Orange-500
        case 'PainPoint':
        case 'Requirement':
            return '#c2410c'; // Orange-700

        // --- 7. REGULATORY (Yellow) ---
        case 'Agency':
        case 'Standard':
            return '#eab308'; // Yellow-500
        case 'Audit':
            return '#ca8a04'; // Yellow-600

        // --- 8. JOURNALISM (Pink) ---
        case 'Source':
            return '#ec4899'; // Pink-500
        case 'Event': 
        case 'Date':
            return '#f59e0b'; // Amber-500 (Shared)

        // --- 9. HR (Purple) ---
        case 'Employee':
        case 'Role':
            return '#a855f7'; // Purple-500
        case 'Department':
        case 'Benefit':
            return '#9333ea'; // Purple-600

        default: 
            return '#71717a'; // Zinc-500 (Gray default)
    }
};

export const getTailwindColor = (type: string) => {
    // General
    if (['Concept', 'Object'].includes(type)) return 'text-indigo-400 bg-indigo-950/50';
    
    // Legal
    if (['Contract', 'Statute', 'Regulation', 'Clause', 'Violation', 'Policy'].includes(type)) return 'text-red-400 bg-red-950/50';
    
    // Financial
    if (['Company', 'Asset', 'Metric', 'Risk', 'Organization', 'Currency'].includes(type)) return 'text-emerald-400 bg-emerald-950/50';
    
    // Medical
    if (['Patient', 'Symptom', 'Condition', 'Drug', 'Treatment'].includes(type)) return 'text-cyan-400 bg-cyan-950/50';
    
    // Engineering
    if (['System', 'Component', 'API', 'Function', 'Class'].includes(type)) return 'text-violet-400 bg-violet-950/50';
    
    // Sales
    if (['Client', 'PainPoint', 'Competitor', 'Product', 'Requirement'].includes(type)) return 'text-orange-400 bg-orange-950/50';
    
    // Regulatory
    if (['Agency', 'Standard', 'Audit'].includes(type)) return 'text-yellow-400 bg-yellow-950/50';
    
    // Journalism
    if (['Source', 'Event', 'Date', 'Location'].includes(type)) return 'text-pink-400 bg-pink-950/50';
    
    // HR
    if (['Employee', 'Role', 'Department', 'Benefit', 'Skill'].includes(type)) return 'text-purple-400 bg-purple-950/50';
    
    return 'text-zinc-400 bg-zinc-900';
};