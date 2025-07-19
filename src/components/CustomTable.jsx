import { Pencil, Trash2 } from "lucide-react";

const CustomTable = ({
  visibleColumns,
  data,
  selectedRows,
  setSelectedRows,
  onEdit,
  onDelete,
  rowKey = "id",
}) => {
  const visible = visibleColumns.filter((col) => col.visible);

  const toggleRow = (keyValue) => {
    setSelectedRows((prev) =>
      prev.includes(keyValue)
        ? prev.filter((rowId) => rowId !== keyValue)
        : [...prev, keyValue]
    );
  };

  return (
    <>
      {data.map((row, rowIndex) => (
        <tr key={row[rowKey] || rowIndex} className="border-t">
          {visible.map((col, colIndex) => (
            <td key={colIndex} className="border text-xs px-4 py-2">
              {colIndex === 0 ? (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(row[rowKey])}
                    onChange={() => toggleRow(row[rowKey])}
                    className="accent-yellow-400"
                  />
                  {row[col.name]}
                </div>
              ) : (
                row[col.name]
              )}
            </td>
          ))}

          <td className="border px-4 py-2 flex gap-2 justify-center">
            <button 
              onClick={() => onEdit(row)} 
              className="text-blue-600 hover:text-blue-800"
              title="Edit"
            >
              <Pencil size={16} />
            </button>
          </td>
        </tr>
      ))}
    </>
  );
};

export default CustomTable;
