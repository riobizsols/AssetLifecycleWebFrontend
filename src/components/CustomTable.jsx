import { Pencil, Eye, Plus } from "lucide-react";
import StatusBadge from "./StatusBadge";

const CustomTable = ({
  visibleColumns,
  data,
  selectedRows,
  setSelectedRows,
  onEdit,
  onDelete,
  onView,
  onAdd,
  rowKey = "id",
  showActions = true,
  showCheckbox = true,
  renderCell,
  onRowClick,
  onRowAction,
  actionLabel = "Action",
  showAddButton = false,
  addButtonTitle = "Add",
  isReadOnly = false,
}) => {
  const visible = visibleColumns.filter((col) => col.visible);

  const toggleRow = (keyValue) => {
    setSelectedRows((prev) =>
      prev.includes(keyValue)
        ? prev.filter((rowId) => rowId !== keyValue)
        : [...prev, keyValue]
    );
  };

  const renderCellContent = (col, row) => {
    // Handle status column
    if (col.name === "status") {
      return <StatusBadge status={row[col.name]} />;
    }
    
    // Handle expiry_status column
    if (col.name === "expiry_status") {
      const expiryStatus = row.expiry_status;
      if (expiryStatus && expiryStatus.text && expiryStatus.color) {
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${expiryStatus.color}`}>
            {expiryStatus.text}
          </span>
        );
      }
      return row[col.name];
    }
    
    // Handle action column
    if (col.name === "action") {
      if (onRowAction) {
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRowAction(row);
            }}
            className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
          >
            {actionLabel}
          </button>
        );
      }
      return row[col.name];
    }
    
    // Handle other columns
    return row[col.name];
  };

  return (
    <>
      {data.map((row, rowIndex) => (
        <tr
          key={row[rowKey] || rowIndex}
          className={`border-t${onRowClick ? ' cursor-pointer hover:bg-gray-100' : ''}`}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
        >
          {visible.map((col, colIndex) => (
            <td key={colIndex} className="border text-xs px-4 py-2">
              {colIndex === 0 ? (
                <div className="flex items-center gap-2">
                  {showActions && showCheckbox && !isReadOnly && (
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(row[rowKey])}
                      onChange={() => toggleRow(row[rowKey])}
                      className="accent-yellow-400"
                    />
                  )}
                  {renderCellContent(col, row)}
                </div>
              ) : (
                renderCellContent(col, row)
              )}
            </td>
          ))}

          {showActions && (
            <td className="border px-4 py-2 flex gap-2 justify-center">
              {/* {onView && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(row);
                  }} 
                  className="text-green-600 hover:text-green-800"
                  title="View"
                >
                  <Eye size={16} />
                </button>
              )} */}
              {showAddButton && onAdd && !isReadOnly && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd(row);
                  }} 
                  className="text-[#003366] hover:text-[#002347]"
                  title={addButtonTitle}
                >
                  <Plus size={16} />
                </button>
              )}
              {onRowAction && !isReadOnly && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowAction(row);
                  }} 
                  className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                  title={actionLabel}
                >
                  {actionLabel}
                </button>
              )}
              {onEdit && !onRowAction && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(row);
                  }} 
                  className="text-blue-600 hover:text-blue-800"
                  title={isReadOnly ? "View" : "Edit"}
                >
                  <Pencil size={16} />
                </button>
              )}
            </td>
          )}
        </tr>
      ))}
    </>
  );
};

export default CustomTable;
