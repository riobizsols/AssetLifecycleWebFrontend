import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../lib/axios";
import ProductSupplyForm from "./ProductSupplyForm";
import ServiceSupplyForm from "./ServiceSupplyForm";
import { useAuthStore } from "../store/useAuthStore";
import { v4 as uuidv4 } from "uuid";

const AddEntityForm = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const org_id = user?.org_id || "";

  const [form, setForm] = useState({
    vendor_name: "",
    company: "",
    email: "",
    contact_number: "",
    gst_number: "",
    cin_number: "",
    product_supply: false,
    service_supply: false,
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    contact_person_name: "",
    contact_person_email: "",
    int_status: 1,
    created_by: "admin", // later replace with current user
    changed_by: "admin", // later replace with current user
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Vendor Details");
  const [createdVendorId, setCreatedVendorId] = useState(""); // Store generated vendor_id

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Uncheck disables tab
    if (
      type === "checkbox" &&
      !checked &&
      activeTab ===
        (name === "product_supply"
          ? "Product Details"
          : name === "service_supply"
          ? "Service Details"
          : "")
    ) {
      setActiveTab("Vendor Details");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await API.post("/create-vendor", form); // Backend adds ext_id, created_on, org_id
      const vendorId = response.data?.data?.vendor_id;
      setCreatedVendorId(vendorId || "");
      alert("Vendor created successfully!");
      // Optionally: navigate("/master-data/vendors");
    } catch (error) {
      console.error(error);
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
        {/* Tabs */}
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
            <div className="grid grid-cols-3 gap-6 mb-6">
              {/* <FormInput label="Vendor Id" name="vendor_id" value={createdVendorId} readOnly /> */}
              <FormInput label="Vendor Name" name="vendor_name" value={form.vendor_name} onChange={handleInputChange} required />
              <FormInput label="Company" name="company" value={form.company} onChange={handleInputChange} required />
              <FormInput label="Email" name="email" value={form.email} onChange={handleInputChange} type="email" required />
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              <FormInput label="Contact Number" name="contact_number" value={form.contact_number} onChange={handleInputChange} required />
              <FormInput label="GST Number" name="gst_number" value={form.gst_number} onChange={handleInputChange} />
              <FormInput label="CIN Number" name="cin_number" value={form.cin_number} onChange={handleInputChange} />
            </div>

            {/* Optional Address/Contact Fields */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              <FormInput label="Address Line 1" name="address_line1" value={form.address_line1} onChange={handleInputChange} />
              <FormInput label="City" name="city" value={form.city} onChange={handleInputChange} />
              <FormInput label="State" name="state" value={form.state} onChange={handleInputChange} />
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              <FormInput label="Pincode" name="pincode" value={form.pincode} onChange={handleInputChange} />
              <FormInput label="Contact Person Name" name="contact_person_name" value={form.contact_person_name} onChange={handleInputChange} />
              <FormInput label="Contact Person Email" name="contact_person_email" value={form.contact_person_email} onChange={handleInputChange} />
            </div>

            {/* Checkboxes */}
            <div className="flex flex-col gap-3 mb-10 pl-2">
              <FormCheckbox label="Product Supply" name="product_supply" checked={form.product_supply} onChange={handleInputChange} />
              <FormCheckbox label="Service Supply" name="service_supply" checked={form.service_supply} onChange={handleInputChange} />
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

        {activeTab === "Product Details" && <ProductSupplyForm vendorId={createdVendorId} orgId={org_id} />}
        {activeTab === "Service Details" && <ServiceSupplyForm vendorId={createdVendorId} orgId={org_id} />}
      </div>
    </div>
  );
};

// Reusable input component
const FormInput = ({ label, name, value, onChange, required = false, type = "text", readOnly = false }) => (
  <div>
    <label className="block text-sm font-medium mb-1 text-gray-700">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      readOnly={readOnly}
      className={`w-full px-3 py-2 border border-gray-300 rounded text-sm ${readOnly ? 'bg-gray-200 text-gray-700 cursor-not-allowed' : 'bg-white'} ${readOnly && name === 'vendor_id' ? 'focus:ring-0 focus:border-gray-300 hover:border-gray-300' : 'focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]'}`}
      placeholder={name === 'vendor_id' && !value ? 'Will be generated' : label}
      tabIndex={readOnly ? -1 : 0}
    />
  </div>
);

const FormCheckbox = ({ label, name, checked, onChange }) => (
  <label className="inline-flex items-center text-gray-700 text-base font-medium">
    <input
      type="checkbox"
      name={name}
      checked={checked}
      onChange={onChange}
      className="mr-2 w-4 h-4 accent-[#0E2F4B]"
    />
    {label}
  </label>
);

export default AddEntityForm;
