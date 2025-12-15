import { createContext, useContext, useState } from 'react';

export const AdminSettingsContext = createContext();

export const useAdminSettings = () => {
  const context = useContext(AdminSettingsContext);
  if (!context) {
    throw new Error('useAdminSettings must be used within AdminSettingsProvider');
  }
  return context;
};

export const AdminSettingsProvider = ({ children }) => {
  const [isAdminSettingsMode, setIsAdminSettingsMode] = useState(false);

  return (
    <AdminSettingsContext.Provider value={{ isAdminSettingsMode, setIsAdminSettingsMode }}>
      {children}
    </AdminSettingsContext.Provider>
  );
};

