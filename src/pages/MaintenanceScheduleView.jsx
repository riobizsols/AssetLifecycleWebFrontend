import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const MaintenanceScheduleView = () => {
  const { t } = useLanguage();
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t('maintenanceSchedule.title')}</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">{t('maintenanceSchedule.functionalityComingSoon')}</p>
        <p className="text-sm text-gray-500 mt-2">{t('maintenanceSchedule.readOnlyAccessNote')}</p>
      </div>
    </div>
  );
};

export default MaintenanceScheduleView; 