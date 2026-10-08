import { createContext, useContext, useState, useEffect } from 'react';

const MedicineContext = createContext();

export function MedicineProvider({ children }) {
  const [savedMedicines, setSavedMedicines] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('aarogya_medicines') || '[]');
      setSavedMedicines(Array.isArray(saved) ? saved : []);
    } catch {
      setSavedMedicines([]);
    }
    setIsLoaded(true);
  }, []);

  const addMedicine = (med) => {
    const updated = [...savedMedicines, med];
    setSavedMedicines(updated);
    try {
      localStorage.setItem('aarogya_medicines', JSON.stringify(updated));
    } catch (error) {
      console.warn('Could not save medicines for offline use:', error);
    }
  };

  return (
    <MedicineContext.Provider value={{ savedMedicines, addMedicine, isLoaded }}>
      {children}
    </MedicineContext.Provider>
  );
}

export function useMedicine() {
  return useContext(MedicineContext);
}
