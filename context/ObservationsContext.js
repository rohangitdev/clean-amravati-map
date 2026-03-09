import { createContext, useContext, useState } from 'react';

const ObservationsContext = createContext();

export function ObservationsProvider({ children }) {
  const [observations, setObservations] = useState([]);

  const addObservation = (obs) => {
    setObservations((prev) => [
      ...prev,
      { ...obs, id: `obs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` },
    ]);
  };

  return (
    <ObservationsContext.Provider value={{ observations, addObservation }}>
      {children}
    </ObservationsContext.Provider>
  );
}

export function useObservations() {
  const ctx = useContext(ObservationsContext);
  if (!ctx) throw new Error('useObservations must be used within ObservationsProvider');
  return ctx;
}
