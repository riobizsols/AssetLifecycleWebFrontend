// components/FormLayout.jsx
const FormLayout = ({ title, children, onCancel, onSubmit }) => (
  <div className="p-6 bg-white rounded shadow">
    <h2 className="text-lg font-semibold mb-4 border-b pb-2">{title}</h2>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="space-y-4">{children}</div>
      <div className="flex justify-end mt-6 gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-300 px-4 py-2 rounded text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-[#002F5F] text-white px-4 py-2 rounded text-sm"
        >
          Save
        </button>
      </div>
    </form>
  </div>
);
export default FormLayout;
