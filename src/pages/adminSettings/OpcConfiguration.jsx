import { useNavigation } from "../../hooks/useNavigation";
import CbmRulesTab from "../../components/opc/CbmRulesTab";

const OpcConfiguration = () => {
  const { hasEditAccess } = useNavigation();
  const canEdit = hasEditAccess("OPCCONFIG") || hasEditAccess("ADMINSETTINGS");

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">OPC Configuration</h1>
        <p className="text-gray-600 mt-1">
          Set conditions on mapped OPC tags to trigger CBM maintenance or an inspection for the asset
        </p>
      </div>
      <CbmRulesTab canEdit={canEdit} />
    </div>
  );
};

export default OpcConfiguration;
