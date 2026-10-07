import { createContext, useContext, useState, useEffect } from 'react';

const MedicineContext = createContext();

export function MedicineProvider({ children }) {
  const [savedMedicines, setSavedMedicines] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('aarogya_medicines');
    if (saved) {
      setSavedMedicines(JSON.parse(saved));
    } else {
      // Pre-seed with Amoxicillin so the home screen isn't empty initially.
      const initial = [{
        name: 'Amoxicillin',
        dosage: '500',
        instructions: 'Take With Food',
        pillsRemaining: 12
      }];
      setSavedMedicines(initial);
      localStorage.setItem('aarogya_medicines', JSON.stringify(initial));
    }
    setIsLoaded(true);
  }, []);

  const addMedicine = (med) => {
    const updated = [...savedMedicines, med];
    setSavedMedicines(updated);
    localStorage.setItem('aarogya_medicines', JSON.stringify(updated));
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
