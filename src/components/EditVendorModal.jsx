import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const EditVendorModal = ({ show, onClose, onConfirm, vendor }) => {
  const [formData, setFormData] = useState({
    vendor_name: '',
    company_name: '',
    company_email: '',
    contact_person_name: '',
    contact_person_email: '',
    contact_person_number: '',
    gst_number: '',
    cin_number: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    int_status: 1
  });

  useEffect(() => {
    if (vendor) {
      setFormData({
        vendor_name: vendor.vendor_name || '',
        company_name: vendor.company_name || '',
        company_email: vendor.company_email || '',
        contact_person_name: vendor.contact_person_name || '',
        contact_person_email: vendor.contact_person_email || '',
        contact_person_number: vendor.contact_person_number || '',
        gst_number: vendor.gst_number || '',
        cin_number: vendor.cin_number || '',
        address_line1: vendor.address_line1 || '',
        address_line2: vendor.address_line2 || '',
        city: vendor.city || '',
        state: vendor.state || '',
        pincode: vendor.pincode || '',
        int_status: vendor.int_status === 'Active' ? 1 : 0
      });
    }
  }, [vendor]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.vendor_name || !formData.company_name || !formData.company_email) {
      toast.error('Vendor name, company name and company email are required');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.company_email)) {
      toast.error('Please enter a valid company email');
      return;
    }
    if (formData.contact_person_email && !emailRegex.test(formData.contact_person_email)) {
      toast.error('Please enter a valid contact person email');
      return;
    }

    // Validate phone number format
    if (formData.contact_person_number && !/^\d{10}$/.test(formData.contact_person_number)) {
      toast.error('Contact number should be 10 digits');
      return;
    }

    // Validate pincode format
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      toast.error('Pincode should be 6 digits');
      return;
    }

    onConfirm(formData);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white w-[800px] rounded shadow-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-[#003b6f] text-white font-semibold px-6 py-3 flex justify-between items-center rounded-t sticky top-0">
          <span>Edit Vendor</span>
          <button
            onClick={onClose}
            className="text-yellow-400 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Divider */}
        <div className="h-[3px] bg-[#ffc107]" />

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  name="vendor_name"
                  value={formData.vendor_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Email *
                </label>
                <input
                  type="email"
                  name="company_email"
                  value={formData.company_email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GST Number
                </label>
                <input
                  type="text"
                  name="gst_number"
                  value={formData.gst_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CIN Number
                </label>
                <input
                  type="text"
                  name="cin_number"
                  value={formData.cin_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="int_status"
                  value={formData.int_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>
            </div>

            {/* Contact and Address Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person Name (Optional)
                </label>
                <input
                  type="text"
                  name="contact_person_name"
                  value={formData.contact_person_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person Email (Optional)
                </label>
                <input
                  type="email"
                  name="contact_person_email"
                  value={formData.contact_person_email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Number (Optional)
                </label>
                <input
                  type="text"
                  name="contact_person_number"
                  value={formData.contact_person_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 1
                </label>
                <input
                  type="text"
                  name="address_line1"
                  value={formData.address_line1}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  name="address_line2"
                  value={formData.address_line2}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm font-medium py-1.5 px-5 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#ffc107] hover:bg-[#e0a800] text-white text-sm font-medium py-1.5 px-5 rounded"
            >
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditVendorModal; 