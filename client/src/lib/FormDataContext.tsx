import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { DEFAULT_FORM_VALUES } from './defaults';

export interface FormData {
  adet: number;
  satisFiyat: number;
  birimMaliyet: number;
  kargo: number;
  komisyon: number;
  kdvOrani: number;
  iadeOrani: number;
  gelirVergisi: number;
  personel: number;
  depo: number;
  muhasebe: number;
  pazarlama: number;
  digerGiderler: number;
  hedefKarTL: number;
}

interface FormDataContextType {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  resetFormData: () => void;
}

const FormDataContext = createContext<FormDataContextType | undefined>(undefined);

export function FormDataProvider({ children }: { children: React.ReactNode }) {
  const [formData, setFormData] = useState<FormData>(() => {
    try {
      const saved = localStorage.getItem('global_form_data');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback to defaults
    }
    return DEFAULT_FORM_VALUES;
  });

  const updateFormData = useCallback((updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetFormData = useCallback(() => {
    setFormData(DEFAULT_FORM_VALUES);
  }, []);

  // Persist to localStorage whenever formData changes
  useEffect(() => {
    localStorage.setItem('global_form_data', JSON.stringify(formData));
  }, [formData]);

  return (
    <FormDataContext.Provider value={{ formData, updateFormData, resetFormData }}>
      {children}
    </FormDataContext.Provider>
  );
}

export function useFormData() {
  const context = useContext(FormDataContext);
  if (!context) {
    throw new Error('useFormData must be used within FormDataProvider');
  }
  return context;
}
