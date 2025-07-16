import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../lib/axios";
import ProductSupplyForm from "./ProductSupplyForm";
import ServiceSupplyForm from "./ServiceSupplyForm";

const AddEntityForm = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    vendor_id: "",
    vendor_name: "",
    company: "",
    email: "",
    contact_number: "",
    gst_number: "",
    cin_number: "",
    product_supply: false,
    service_supply: false,
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Vendor Details");

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (type === "checkbox" && !checked && activeTab === (name === "product_supply" ? "Product Supply" : name === "service_supply" ? "Service Supply" : "")) {
      setActiveTab("Vendor Details");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await API.post("/vendors", form);
      alert("Vendor created successfully!");
      navigate("/master-data/vendors");
    } catch (error) {
      alert("Failed to create. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const tabs = ["Vendor Details"];
  if (form.product_supply) tabs.push("Product Details");
  if (form.service_supply) tabs.push("Service Details");

  return (
    <div className="max-w-7xl mx-auto mt-4 bg-white shadow rounded">
      {/* Card Header */}
      <div className="bg-[#0E2F4B] text-white py-3 px-6 rounded-t border-b-4 border-[#FFC107] flex justify-center items-center">
        <span className="text-2xl font-semibold text-center w-full">Vendor Details</span>
      </div>
      <div className="px-8 pt-8">
        {/* Tab Bar */}
        <div className="flex border-b border-gray-200 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`px-6 py-2 -mb-px font-semibold text-base border-b-2 focus:outline-none transition-all ${
                activeTab === tab
                  ? "border-[#0E2F4B] text-[#0E2F4B] bg-white"
                  : "border-transparent text-gray-500 bg-transparent"
              }`}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
        {/* Tab Content */}
        {activeTab === "Vendor Details" && (
          <form onSubmit={handleSubmit}>
            {/* First Row */}
            <div className="grid grid-cols-4 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Vendor Id</label>
                <input
                  type="text"
                  name="vendor_id"
                  value={form.vendor_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                  placeholder="Vendor Id"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Vendor Name</label>
                <input
                  type="text"
                  name="vendor_name"
                  value={form.vendor_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                  placeholder="Vendor Name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Company</label>
                <input
                  type="text"
                  name="company"
                  value={form.company}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                  placeholder="Company"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                  placeholder="Email"
                  required
                />
              </div>
            </div>
            {/* Second Row */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Contact Number</label>
                <input
                  type="text"
                  name="contact_number"
                  value={form.contact_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                  placeholder="Contact Number"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">GST Number</label>
                <input
                  type="text"
                  name="gst_number"
                  value={form.gst_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                  placeholder="GST Number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">CIN Number</label>
                <input
                  type="text"
                  name="cin_number"
                  value={form.cin_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                  placeholder="CIN Number"
                />
              </div>
            </div>
            {/* Checkboxes */}
            <div className="flex flex-col gap-3 mb-10 pl-2">
              <label className="inline-flex items-center text-gray-700 text-base font-medium">
                <input
                  type="checkbox"
                  name="product_supply"
                  checked={form.product_supply}
                  onChange={handleInputChange}
                  className="mr-2 w-4 h-4 accent-[#0E2F4B]"
                />
                Product Supply
              </label>
              <label className="inline-flex items-center text-gray-700 text-base font-medium">
                <input
                  type="checkbox"
                  name="service_supply"
                  checked={form.service_supply}
                  onChange={handleInputChange}
                  className="mr-2 w-4 h-4 accent-[#0E2F4B]"
                />
                Service Supply
              </label>
            </div>
            {/* Buttons */}
            <div className="flex justify-end gap-3 pb-8">
              <button
                type="button"
                onClick={() => navigate("/master-data/vendors")}
                className="bg-gray-300 text-gray-700 px-8 py-2 rounded text-base font-medium hover:bg-gray-400 transition"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#002F5F] text-white px-8 py-2 rounded text-base font-medium hover:bg-[#0E2F4B] transition"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        )}
        {activeTab === "Product Details" && <ProductSupplyForm />}
        {activeTab === "Service Details" && <ServiceSupplyForm />}
      </div>
    </div>
  );
};

export default AddEntityForm;
