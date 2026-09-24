import { Navigate } from 'react-router-dom';

/** Out of Stock is merged into Stock & Purchase. */
export default function OutOfStockReport() {
  return <Navigate to="/reports/purchase-requirement" replace />;
}
