# Translation Implementation Examples

This document provides practical examples of how to implement translations in different types of components.

## Example 1: Simple Component Translation

### Before (Hardcoded Text)
```jsx
const SimpleComponent = () => {
  return (
    <div>
      <h1>Asset Management</h1>
      <p>Manage your assets efficiently</p>
      <button>Add Asset</button>
    </div>
  );
};
```

### After (With Translations)
```jsx
import { useLanguage } from '../contexts/LanguageContext';

const SimpleComponent = () => {
  const { t } = useLanguage();
  
  return (
    <div>
      <h1>{t('assets.title')}</h1>
      <p>{t('assets.description')}</p>
      <button>{t('assets.addAsset')}</button>
    </div>
  );
};
```

### Translation Files
```json
// en.json
{
  "assets": {
    "title": "Asset Management",
    "description": "Manage your assets efficiently",
    "addAsset": "Add Asset"
  }
}

// de.json
{
  "assets": {
    "title": "Anlagenverwaltung",
    "description": "Verwalten Sie Ihre Anlagen effizient",
    "addAsset": "Anlage hinzufügen"
  }
}
```

## Example 2: Form Component with Validation

### Before
```jsx
const AssetForm = () => {
  const [errors, setErrors] = useState({});
  
  const validate = (data) => {
    const newErrors = {};
    if (!data.name) newErrors.name = "Asset name is required";
    if (!data.type) newErrors.type = "Please select an asset type";
    return newErrors;
  };

  return (
    <form>
      <div>
        <label>Asset Name *</label>
        <input placeholder="Enter asset name" />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>
      
      <div>
        <label>Asset Type *</label>
        <select>
          <option value="">Select asset type</option>
        </select>
        {errors.type && <span className="error">{errors.type}</span>}
      </div>
      
      <button type="submit">Save Asset</button>
      <button type="button">Cancel</button>
    </form>
  );
};
```

### After
```jsx
import { useLanguage } from '../contexts/LanguageContext';

const AssetForm = () => {
  const { t } = useLanguage();
  const [errors, setErrors] = useState({});
  
  const validate = (data) => {
    const newErrors = {};
    if (!data.name) newErrors.name = t('validation.required');
    if (!data.type) newErrors.type = t('assets.selectAssetType');
    return newErrors;
  };

  return (
    <form>
      <div>
        <label>
          {t('assets.assetName')} <span className="text-red-600">*</span>
        </label>
        <input placeholder={t('assets.enterAssetName')} />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>
      
      <div>
        <label>
          {t('assets.assetType')} <span className="text-red-600">*</span>
        </label>
        <select>
          <option value="">{t('common.selectOption')}</option>
        </select>
        {errors.type && <span className="error">{errors.type}</span>}
      </div>
      
      <button type="submit">{t('common.save')}</button>
      <button type="button">{t('common.cancel')}</button>
    </form>
  );
};
```

### Additional Translation Keys
```json
// en.json
{
  "assets": {
    "enterAssetName": "Enter asset name",
    "selectAssetType": "Please select an asset type"
  },
  "validation": {
    "required": "This field is required"
  },
  "common": {
    "selectOption": "Select an option",
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

## Example 3: Table Component

### Before
```jsx
const AssetTable = ({ assets }) => {
  return (
    <table>
      <thead>
        <tr>
          <th>Asset ID</th>
          <th>Name</th>
          <th>Type</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {assets.map(asset => (
          <tr key={asset.id}>
            <td>{asset.id}</td>
            <td>{asset.name}</td>
            <td>{asset.type}</td>
            <td>
              <span className={`badge ${asset.status.toLowerCase()}`}>
                {asset.status}
              </span>
            </td>
            <td>
              <button>Edit</button>
              <button>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

### After
```jsx
import { useLanguage } from '../contexts/LanguageContext';

const AssetTable = ({ assets }) => {
  const { t } = useLanguage();
  
  const getStatusText = (status) => {
    const statusMap = {
      'active': t('common.active'),
      'inactive': t('common.inactive'),
      'maintenance': t('common.inMaintenance'),
      'decommissioned': t('common.decommissioned')
    };
    return statusMap[status.toLowerCase()] || status;
  };

  return (
    <table>
      <thead>
        <tr>
          <th>{t('assets.assetId')}</th>
          <th>{t('common.name')}</th>
          <th>{t('common.type')}</th>
          <th>{t('common.status')}</th>
          <th>{t('common.actions')}</th>
        </tr>
      </thead>
      <tbody>
        {assets.map(asset => (
          <tr key={asset.id}>
            <td>{asset.id}</td>
            <td>{asset.name}</td>
            <td>{asset.type}</td>
            <td>
              <span className={`badge ${asset.status.toLowerCase()}`}>
                {getStatusText(asset.status)}
              </span>
            </td>
            <td>
              <button>{t('common.edit')}</button>
              <button>{t('common.delete')}</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

## Example 4: Modal Component

### Before
```jsx
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, itemName }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Confirm Deletion</h3>
        <p>Are you sure you want to delete "{itemName}"? This action cannot be undone.</p>
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={onConfirm} className="btn-danger">Delete</button>
        </div>
      </div>
    </div>
  );
};
```

### After
```jsx
import { useLanguage } from '../contexts/LanguageContext';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, itemName }) => {
  const { t } = useLanguage();
  
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{t('common.confirmDeletion')}</h3>
        <p>
          {t('messages.deleteConfirmWithName', { name: itemName })}
        </p>
        <div className="modal-actions">
          <button onClick={onClose}>{t('common.cancel')}</button>
          <button onClick={onConfirm} className="btn-danger">
            {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
};
```

### Translation with Interpolation
```json
// en.json
{
  "common": {
    "confirmDeletion": "Confirm Deletion"
  },
  "messages": {
    "deleteConfirmWithName": "Are you sure you want to delete \"{{name}}\"? This action cannot be undone."
  }
}

// de.json
{
  "common": {
    "confirmDeletion": "Löschung bestätigen"
  },
  "messages": {
    "deleteConfirmWithName": "Sind Sie sicher, dass Sie \"{{name}}\" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden."
  }
}
```

## Example 5: Toast Notifications

### Before
```jsx
import toast from 'react-hot-toast';

const AssetService = {
  async createAsset(data) {
    try {
      const response = await api.post('/assets', data);
      toast.success('Asset created successfully!');
      return response.data;
    } catch (error) {
      toast.error('Failed to create asset. Please try again.');
      throw error;
    }
  }
};
```

### After
```jsx
import toast from 'react-hot-toast';
import i18n from '../i18n/config'; // Direct import for services

const AssetService = {
  async createAsset(data) {
    try {
      const response = await api.post('/assets', data);
      toast.success(i18n.t('messages.assetCreated'));
      return response.data;
    } catch (error) {
      toast.error(i18n.t('messages.assetCreateFailed'));
      throw error;
    }
  }
};
```

### Or with Custom Hook
```jsx
// hooks/useToastMessages.js
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';

export const useToastMessages = () => {
  const { t } = useLanguage();
  
  return {
    success: {
      assetCreated: () => toast.success(t('messages.assetCreated')),
      assetUpdated: () => toast.success(t('messages.assetUpdated')),
      assetDeleted: () => toast.success(t('messages.assetDeleted')),
    },
    error: {
      assetCreateFailed: () => toast.error(t('messages.assetCreateFailed')),
      networkError: () => toast.error(t('messages.networkError')),
      genericError: () => toast.error(t('messages.operationFailed')),
    }
  };
};

// In component
const MyComponent = () => {
  const toastMessages = useToastMessages();
  
  const handleCreate = async () => {
    try {
      await createAsset(data);
      toastMessages.success.assetCreated();
    } catch (error) {
      toastMessages.error.assetCreateFailed();
    }
  };
};
```

## Best Practices Summary

1. **Import Pattern**: Always import `useLanguage` at the top of components
2. **Key Organization**: Group related translations in nested objects
3. **Reusable Text**: Use `common` section for frequently used text
4. **Validation**: Centralize validation messages in `validation` section
5. **Interpolation**: Use `{{variable}}` syntax for dynamic content
6. **Status Translation**: Create mapping functions for enum values
7. **Services**: Use direct i18n import or custom hooks for services
8. **Consistent Naming**: Follow camelCase convention for translation keys

## Testing Translations

```jsx
// Test component with different languages
describe('AssetTable', () => {
  it('should display German translations', () => {
    // Mock language context
    const mockLanguageContext = {
      t: jest.fn((key) => germanTranslations[key]),
      currentLanguage: 'de'
    };
    
    render(
      <LanguageContext.Provider value={mockLanguageContext}>
        <AssetTable assets={mockAssets} />
      </LanguageContext.Provider>
    );
    
    expect(screen.getByText('Anlagen-ID')).toBeInTheDocument();
  });
});
```
