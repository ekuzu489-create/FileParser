import React, { createContext, useContext, useState, useCallback } from 'react';

interface ResetContextType {
  resetVersion: number;
  triggerGlobalReset: () => void;
}

const ResetContext = createContext<ResetContextType | undefined>(undefined);

export function ResetProvider({ children }: { children: React.ReactNode }) {
  const [resetVersion, setResetVersion] = useState(0);

  const triggerGlobalReset = useCallback(() => {
    // Clear all localStorage keys
    localStorage.removeItem('global_form_data');
    localStorage.removeItem('comparison_hedefKarTL');
    localStorage.removeItem('comparison_scenario1_data');
    localStorage.removeItem('comparison_scenario2_data');
    localStorage.removeItem('bulk_simulation_fixed_expenses');
    localStorage.removeItem('bulk_simulation_products');
    localStorage.removeItem('bulk_simulation_results');
    localStorage.removeItem('bulk_simulation_variable_expenses');
    
    // Trigger re-initialization in all components
    setResetVersion(v => v + 1);
  }, []);

  return (
    <ResetContext.Provider value={{ resetVersion, triggerGlobalReset }}>
      {children}
    </ResetContext.Provider>
  );
}

export function useGlobalReset() {
  const context = useContext(ResetContext);
  if (!context) {
    throw new Error('useGlobalReset must be used within ResetProvider');
  }
  return context;
}
