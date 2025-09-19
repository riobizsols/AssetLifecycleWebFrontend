# Translation Guidelines - What to Translate vs What NOT to Translate

## ✅ TRANSLATE (Labels and UI Text)

### Field Labels
```jsx
// ✅ CORRECT - Translate field labels
<label>{t('assets.assetType')}</label>  // "Asset Type" → "Anlagentyp"
<label>{t('assets.serialNumber')}</label>  // "Serial Number" → "Seriennummer"
```

### UI Elements
```jsx
// ✅ CORRECT - Translate buttons, headers, messages
<button>{t('common.save')}</button>  // "Save" → "Speichern"
<h1>{t('assets.editAsset')}</h1>  // "Edit Asset" → "Anlage bearbeiten"
<div>{t('common.actions')}</div>  // "Actions" → "Aktionen"
```

### Status Labels (UI)
```jsx
// ✅ CORRECT - Translate status display labels
<span>{t('common.active')}</span>  // "Active" → "Aktiv"
<span>{t('common.inactive')}</span>  // "Inactive" → "Inaktiv"
```

### Messages and Notifications
```jsx
// ✅ CORRECT - Translate user messages
toast.success(t('assets.assetDeletedSuccessfully'));  // "Asset deleted" → "Anlage gelöscht"
```

## ❌ DO NOT TRANSLATE (Data Values)

### Database Values
```jsx
// ❌ WRONG - Don't translate data from database
<span>{asset.current_status}</span>  // Keep "Active", "Inactive" as stored in DB

// ✅ CORRECT - Translate only the display
<span>{translateStatus(asset.current_status)}</span>  // Function to map DB value to display
```

### Dropdown Options (Data)
```jsx
// ❌ WRONG - Don't translate dropdown values from API
<option value="Active">{t('common.active')}</option>  // Value stays "Active"

// ✅ CORRECT - Keep value as-is, translate display
<option value="Active">{t('common.active')}</option>  // Display "Aktiv", value "Active"
```

### Property Names from Database
```jsx
// ❌ WRONG - Don't translate dynamic property names in dropdowns
<option value="Connectivity">{t('assets.connectivity')}</option>

// ✅ CORRECT - Only translate labels, keep property names as-is
<label>{translatePropertyName(property.property)}</label>  // Label: "Konnektivität"
<option value="Connectivity">Connectivity</option>  // Value: stays "Connectivity"
```

### User Data
```jsx
// ❌ WRONG - Don't translate user names, technical data
<span>{t('user.name', {name: user.full_name})}</span>

// ✅ CORRECT - Keep user data as-is
<span>{user.full_name}</span>  // "John Doe" stays "John Doe"
```

### Technical Values
```jsx
// ❌ WRONG - Don't translate technical values
<span>{t('technical.ipAddress')}</span>  // "192.168.1.1" should stay as-is

// ✅ CORRECT - Only translate the label
<label>{t('assets.ipAddress')}</label>  // Label: "IP-Adresse"
<span>192.168.1.1</span>  // Value: stays technical
```

## 🎯 Correct Implementation Examples

### Form Fields
```jsx
// ✅ CORRECT
<label>{t('assets.brand')}</label>  // "Brand" → "Marke"
<select>
  <option value="">{t('assets.selectBrand')}</option>  // "Select Brand" → "Marke auswählen"
  <option value="HP">HP</option>  // Brand name stays "HP"
  <option value="Dell">Dell</option>  // Brand name stays "Dell"
</select>
```

### Status Display
```jsx
// ✅ CORRECT - Create mapping function
const getStatusDisplay = (status) => {
  const statusMap = {
    'Active': t('common.active'),     // Display: "Aktiv"
    'Inactive': t('common.inactive'), // Display: "Inaktiv"
    'Disposed': t('common.disposed')  // Display: "Entsorgt"
  };
  return statusMap[status] || status;
};

// Usage
<span>{getStatusDisplay(asset.current_status)}</span>  // Shows "Aktiv" but saves "Active"
```

### Table Headers vs Data
```jsx
// ✅ CORRECT
<table>
  <thead>
    <tr>
      <th>{t('assets.type')}</th>        // Header: "Typ"
      <th>{t('assets.name')}</th>        // Header: "Name"
      <th>{t('assets.status')}</th>      // Header: "Status"
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Purchase Order</td>            // Data: stays "Purchase Order"
      <td>document_name.pdf</td>         // Data: stays as filename
      <td>{getStatusDisplay(doc.status)}</td>  // Display translated, value preserved
    </tr>
  </tbody>
</table>
```

## 🔧 What Needs to be Fixed

Based on your feedback, I should update the implementation to:

1. **Keep dropdown option values unchanged** (HP, Dell, Active, etc.)
2. **Only translate the labels and placeholders**
3. **Preserve all data integrity**
4. **Create display mapping functions for status values**

Would you like me to update the components to follow this correct approach?
