import { useState } from "react";
import { Maximize, Minimize, Trash2 } from "lucide-react";

const initialProducts = [
  { assetType: "Laptop", brand: "Lenovo", model: "L 410", description: "Lenovo" },
  { assetType: "Laptop", brand: "Lenovo", model: "L 512", description: "Lenovo" },
  { assetType: "Monitor", brand: "BenQ", model: "B 365", description: "BenQ" },
  { assetType: "Mouse", brand: "Lenovo", model: "L 190", description: "Lenovo" },
];

const ProductSupplyForm = () => {
  const [products, setProducts] = useState(initialProducts);
  const [form, setForm] = useState({ assetType: "", brand: "", model: "", description: "" });
  const [maximized, setMaximized] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdd = () => {
    if (!form.assetType || !form.brand || !form.model) return;
    setProducts([...products, { ...form, description: form.brand }]);
    setForm({ assetType: "", brand: "", model: "", description: "" });
  };

  const handleDelete = (idx) => {
    setProducts(products.filter((_, i) => i !== idx));
  };

  // Table card content
  const tableCard = (
    <div className="bg-[#F5F8FA] rounded shadow border relative">
      <div className="px-4 py-2 font-semibold text-[#0E2F4B] text-base border-b border-[#FFC107] flex items-center justify-between">
        <span>Product List</span>
        <button
          type="button"
          onClick={() => setMaximized((m) => !m)}
          className="ml-2 text-[#0E2F4B] hover:text-[#FFC107] focus:outline-none"
          title={maximized ? "Minimize" : "Maximize"}
        >
          {maximized ? (
            <Minimize className="h-5 w-5" />
          ) : (
            <Maximize className="h-5 w-5" />
          )}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-[#0E2F4B] text-white">
              <th className="px-6 py-3 text-left text-sm font-medium">Asset Type</th>
              <th className="px-6 py-3 text-left text-sm font-medium">Brand</th>
              <th className="px-6 py-3 text-left text-sm font-medium">Model</th>
              <th className="px-6 py-3 text-left text-sm font-medium">Description</th>
              <th className="px-6 py-3 text-center text-sm font-medium w-20"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((p, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-6 py-2 text-sm text-gray-900">{p.assetType}</td>
                <td className="px-6 py-2 text-sm text-gray-900">{p.brand}</td>
                <td className="px-6 py-2 text-sm text-gray-900">{p.model}</td>
                <td className="px-6 py-2 text-sm text-gray-900">{p.description}</td>
                <td className="px-6 py-2 text-center">
                  <button 
                    onClick={() => handleDelete(idx)} 
                    className="text-yellow-500 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="pb-6">
      {/* Add Product Row */}
      <div className="flex items-end gap-4 mb-8">
        <div>
          <label className="block text-sm text-gray-700 mb-2">Asset Type</label>
          <select
            name="assetType"
            value={form.assetType}
            onChange={handleChange}
            className="px-3 py-1 border border-gray-300 rounded bg-white w-48 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
          >
            <option value="">Select</option>
            <option value="Laptop">Laptop</option>
            <option value="Monitor">Monitor</option>
            <option value="Mouse">Mouse</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-2">Brand</label>
          <input
            name="brand"
            value={form.brand}
            onChange={handleChange}
            className="px-3 py-1 border border-gray-300 rounded w-48 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
            placeholder=""
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-2">Model</label>
          <input
            name="model"
            value={form.model}
            onChange={handleChange}
            className="px-3 py-1 border border-gray-300 rounded w-48 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
            placeholder=""
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="bg-[#0E2F4B] text-white px-6 py-1 rounded hover:bg-[#1e40af] transition-colors"
        >
          Add
        </button>
      </div>
      {/* Product List Table with maximize/minimize */}
      {maximized ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="w-full h-full flex items-center justify-center">
            <div className="bg-white w-11/12 h-5/6 rounded shadow-lg overflow-auto p-4 relative">
              {tableCard}
            </div>
          </div>
        </div>
      ) : (
        tableCard
      )}
    </div>
  );
};

export default ProductSupplyForm; 