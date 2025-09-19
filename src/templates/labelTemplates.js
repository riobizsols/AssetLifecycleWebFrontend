// Organization data will be fetched from API
export const getOrgData = async (orgId = 'ORG001') => {
  try {
    // Import API dynamically to avoid circular dependencies
    const { default: API } = await import('../lib/axios');
    const response = await API.get(`/orgs/${orgId}`);
    const org = response.data;
    return {
      name: org.text || 'Organization',
      logo: null, // Will be set dynamically or use fallback
      address: org.org_city || 'City, State',
      phone: '+1 (555) 123-4567', // Add phone field to org table if needed
      website: 'www.organization.com' // Add website field to org table if needed
    };
  } catch (error) {
    console.error('Error fetching organization data:', error);
    // Fallback data
    return {
      name: 'Organization',
      logo: null,
      address: 'City, State',
      phone: '+1 (555) 123-4567',
      website: 'www.organization.com'
    };
  }
};

// Comprehensive Label Templates System
export const labelTemplates = {
  // Standard Templates
  'standard-small': {
    id: 'standard-small',
    name: 'Standard Small Label',
    dimensions: { width: 2, height: 1, unit: 'inch' },
    paperType: 'Paper',
    paperQuality: 'Normal',
    printerTypes: ['Laser', 'Inkjet', 'Multifunction'],
    format: 'barcode-enhanced',
    description: 'Enhanced small label with company logo, name, serial number and barcode',
    layout: {
      companyLogo: { 
        fontSize: 8, 
        fontWeight: 'bold', 
        position: 'top-left',
        width: '20%',
        height: '30%'
      },
      companyName: { 
        fontSize: 6, 
        fontWeight: 'bold', 
        position: 'top-right',
        width: '75%',
        height: '15%'
      },
      serialNumber: { 
        fontSize: 14, 
        fontWeight: 'bold', 
        position: 'center',
        width: '100%',
        height: '25%'
      },
      barcode: { 
        fontSize: 8, 
        position: 'bottom',
        width: '100%',
        height: '30%'
      }
    }
  },
  'standard-medium': {
    id: 'standard-medium',
    name: 'Standard Medium Label',
    dimensions: { width: 3, height: 1.5, unit: 'inch' },
    paperType: 'Paper',
    paperQuality: 'High',
    printerTypes: ['Laser', 'Inkjet', 'Multifunction'],
    format: 'barcode-enhanced',
    description: 'Enhanced medium label with company logo, name, serial number and barcode',
    layout: {
      companyLogo: { 
        fontSize: 10, 
        fontWeight: 'bold', 
        position: 'top-left',
        width: '20%',
        height: '25%'
      },
      companyName: { 
        fontSize: 8, 
        fontWeight: 'bold', 
        position: 'top-right',
        width: '75%',
        height: '12%'
      },
      serialNumber: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        position: 'center',
        width: '100%',
        height: '30%'
      },
      barcode: { 
        fontSize: 10, 
        position: 'bottom',
        width: '100%',
        height: '33%'
      }
    }
  },
  'standard-large': {
    id: 'standard-large',
    name: 'Standard Large Label',
    dimensions: { width: 4, height: 2, unit: 'inch' },
    paperType: 'Paper',
    paperQuality: 'High',
    printerTypes: ['Laser', 'Inkjet', 'Multifunction'],
    format: 'barcode-enhanced',
    description: 'Enhanced large label with company logo, name, serial number and barcode',
    layout: {
      companyLogo: { 
        fontSize: 12, 
        fontWeight: 'bold', 
        position: 'top-left',
        width: '20%',
        height: '20%'
      },
      companyName: { 
        fontSize: 10, 
        fontWeight: 'bold', 
        position: 'top-right',
        width: '75%',
        height: '10%'
      },
      serialNumber: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        position: 'center',
        width: '100%',
        height: '25%'
      },
      barcode: { 
        fontSize: 12, 
        position: 'bottom',
        width: '100%',
        height: '45%'
      }
    }
  },

  // Vinyl Templates
  'vinyl-small': {
    id: 'vinyl-small',
    name: 'Vinyl Small Label',
    dimensions: { width: 1.5, height: 0.75, unit: 'inch' },
    paperType: 'Vinyl',
    paperQuality: 'High',
    printerTypes: ['Label'],
    format: 'barcode-enhanced',
    description: 'Enhanced small vinyl label with company logo, name, serial number and barcode',
    layout: {
      companyLogo: { 
        fontSize: 6, 
        fontWeight: 'bold', 
        position: 'top-left',
        width: '25%',
        height: '40%'
      },
      companyName: { 
        fontSize: 4, 
        fontWeight: 'bold', 
        position: 'top-right',
        width: '70%',
        height: '20%'
      },
      serialNumber: { 
        fontSize: 8, 
        fontWeight: 'bold', 
        position: 'center',
        width: '100%',
        height: '20%'
      },
      barcode: { 
        fontSize: 6, 
        position: 'bottom',
        width: '100%',
        height: '20%'
      }
    }
  },
  'vinyl-medium': {
    id: 'vinyl-medium',
    name: 'Vinyl Medium Label',
    dimensions: { width: 3, height: 1, unit: 'inch' },
    paperType: 'Vinyl',
    paperQuality: 'High',
    printerTypes: ['Label'],
    format: 'barcode-enhanced',
    description: 'Enhanced medium vinyl label with company logo, name, serial number and barcode',
    layout: {
      companyLogo: { 
        fontSize: 8, 
        fontWeight: 'bold', 
        position: 'top-left',
        width: '20%',
        height: '30%'
      },
      companyName: { 
        fontSize: 6, 
        fontWeight: 'bold', 
        position: 'top-right',
        width: '75%',
        height: '15%'
      },
      serialNumber: { 
        fontSize: 14, 
        fontWeight: 'bold', 
        position: 'center',
        width: '100%',
        height: '25%'
      },
      barcode: { 
        fontSize: 8, 
        position: 'bottom',
        width: '100%',
        height: '30%'
      }
    }
  },
  'vinyl-large': {
    id: 'vinyl-large',
    name: 'Vinyl Large Label',
    dimensions: { width: 4, height: 2, unit: 'inch' },
    paperType: 'Vinyl',
    paperQuality: 'High',
    printerTypes: ['Label'],
    format: 'barcode-enhanced',
    description: 'Enhanced large vinyl label with company logo, name, serial number and barcode',
    layout: {
      companyLogo: { 
        fontSize: 10, 
        fontWeight: 'bold', 
        position: 'top-left',
        width: '20%',
        height: '20%'
      },
      companyName: { 
        fontSize: 8, 
        fontWeight: 'bold', 
        position: 'top-right',
        width: '75%',
        height: '10%'
      },
      serialNumber: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        position: 'center',
        width: '100%',
        height: '25%'
      },
      barcode: { 
        fontSize: 10, 
        position: 'bottom',
        width: '100%',
        height: '45%'
      }
    }
  },

  // Industrial Templates
  'industrial-small': {
    id: 'industrial-small',
    name: 'Industrial Small Label',
    dimensions: { width: 2, height: 1, unit: 'inch' },
    paperType: 'Metal',
    paperQuality: 'High',
    printerTypes: ['Industrial'],
    format: 'barcode-enhanced',
    description: 'Enhanced small metal label with company logo, name, serial number and barcode',
    layout: {
      companyLogo: { 
        fontSize: 8, 
        fontWeight: 'bold', 
        position: 'top-left',
        width: '20%',
        height: '30%'
      },
      companyName: { 
        fontSize: 6, 
        fontWeight: 'bold', 
        position: 'top-right',
        width: '75%',
        height: '15%'
      },
      serialNumber: { 
        fontSize: 12, 
        fontWeight: 'bold', 
        position: 'center',
        width: '100%',
        height: '25%'
      },
      barcode: { 
        fontSize: 8, 
        position: 'bottom',
        width: '100%',
        height: '30%'
      }
    }
  },
  'industrial-medium': {
    id: 'industrial-medium',
    name: 'Industrial Medium Label',
    dimensions: { width: 3, height: 1.5, unit: 'inch' },
    paperType: 'Metal',
    paperQuality: 'High',
    printerTypes: ['Industrial'],
    format: 'barcode-enhanced',
    description: 'Enhanced medium metal label with company logo, name, serial number and barcode',
    layout: {
      companyLogo: { 
        fontSize: 10, 
        fontWeight: 'bold', 
        position: 'top-left',
        width: '20%',
        height: '25%'
      },
      companyName: { 
        fontSize: 8, 
        fontWeight: 'bold', 
        position: 'top-right',
        width: '75%',
        height: '12%'
      },
      serialNumber: { 
        fontSize: 14, 
        fontWeight: 'bold', 
        position: 'center',
        width: '100%',
        height: '30%'
      },
      barcode: { 
        fontSize: 10, 
        position: 'bottom',
        width: '100%',
        height: '33%'
      }
    }
  },
  'industrial-large': {
    id: 'industrial-large',
    name: 'Industrial Large Label',
    dimensions: { width: 4, height: 2, unit: 'inch' },
    paperType: 'Metal',
    paperQuality: 'High',
    printerTypes: ['Industrial'],
    format: 'barcode-enhanced',
    description: 'Enhanced large metal label with company logo, name, serial number and barcode',
    layout: {
      companyLogo: { 
        fontSize: 12, 
        fontWeight: 'bold', 
        position: 'top-left',
        width: '20%',
        height: '20%'
      },
      companyName: { 
        fontSize: 10, 
        fontWeight: 'bold', 
        position: 'top-right',
        width: '75%',
        height: '10%'
      },
      serialNumber: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        position: 'center',
        width: '100%',
        height: '25%'
      },
      barcode: { 
        fontSize: 12, 
        position: 'bottom',
        width: '100%',
        height: '45%'
      }
    }
  },

  // Specialized Templates
  'network-equipment': {
    id: 'network-equipment',
    name: 'Network Equipment Label',
    dimensions: { width: 1.5, height: 0.75, unit: 'inch' },
    paperType: 'Vinyl',
    paperQuality: 'High',
    printerTypes: ['Label'],
    format: 'barcode-enhanced',
    description: 'Enhanced small vinyl label for network equipment with company logo, name, serial number and barcode',
    layout: {
      companyLogo: { 
        fontSize: 6, 
        fontWeight: 'bold', 
        position: 'top-left',
        width: '25%',
        height: '40%'
      },
      companyName: { 
        fontSize: 4, 
        fontWeight: 'bold', 
        position: 'top-right',
        width: '70%',
        height: '20%'
      },
      serialNumber: { 
        fontSize: 7, 
        fontWeight: 'bold', 
        position: 'center',
        width: '100%',
        height: '20%'
      },
      barcode: { 
        fontSize: 6, 
        position: 'bottom',
        width: '100%',
        height: '20%'
      }
    }
  },
  'cable-label': {
    id: 'cable-label',
    name: 'Cable Label',
    dimensions: { width: 1, height: 0.5, unit: 'inch' },
    paperType: 'Paper',
    paperQuality: 'Normal',
    printerTypes: ['Label'],
    format: 'barcode-enhanced',
    description: 'Enhanced very small label for cable identification with company logo, name, serial number and barcode',
    layout: {
      companyLogo: { 
        fontSize: 4, 
        fontWeight: 'bold', 
        position: 'top-left',
        width: '30%',
        height: '50%'
      },
      companyName: { 
        fontSize: 3, 
        fontWeight: 'bold', 
        position: 'top-right',
        width: '65%',
        height: '25%'
      },
      serialNumber: { 
        fontSize: 6, 
        fontWeight: 'bold', 
        position: 'center',
        width: '100%',
        height: '25%'
      },
      barcode: { 
        fontSize: 4, 
        position: 'bottom',
        width: '100%',
        height: '0%'
      }
    }
  },
  'asset-tag': {
    id: 'asset-tag',
    name: 'Asset Tag',
    dimensions: { width: 2.5, height: 1.5, unit: 'inch' },
    paperType: 'Paper',
    paperQuality: 'High',
    printerTypes: ['Laser', 'Inkjet'],
    format: 'barcode-enhanced',
    description: 'Enhanced standard asset tag with company logo, name, serial number and barcode',
    layout: {
      companyLogo: { 
        fontSize: 10, 
        fontWeight: 'bold', 
        position: 'top-left',
        width: '20%',
        height: '25%'
      },
      companyName: { 
        fontSize: 8, 
        fontWeight: 'bold', 
        position: 'top-right',
        width: '75%',
        height: '12%'
      },
      serialNumber: { 
        fontSize: 14, 
        fontWeight: 'bold', 
        position: 'center',
        width: '100%',
        height: '30%'
      },
      barcode: { 
        fontSize: 10, 
        position: 'bottom',
        width: '100%',
        height: '33%'
      }
    }
  }
};

// Asset type to template mapping (recommended templates for each asset type)
export const assetTypeTemplateMapping = {
  'Laptop': ['standard-small', 'standard-medium', 'asset-tag'],
  'Desktop Computer': ['standard-small', 'standard-medium', 'asset-tag'],
  'Printer': ['standard-small', 'standard-medium'],
  'Scanner': ['standard-small', 'standard-medium'],
  'Monitor': ['standard-small', 'standard-medium'],
  'Server': ['industrial-large', 'asset-tag'],
  'Router': ['network-equipment', 'vinyl-small'],
  'Switch': ['network-equipment', 'vinyl-small'],
  'Projector': ['standard-small', 'standard-medium'],
  'Camera': ['standard-small', 'standard-medium'],
  'Keyboard': ['standard-small', 'vinyl-small'],
  'Mouse': ['standard-small', 'vinyl-small'],
  'Tablet': ['standard-small', 'standard-medium'],
  'Phone': ['standard-small', 'standard-medium'],
  'Headset': ['standard-small', 'vinyl-small'],
  'External Drive': ['vinyl-medium', 'standard-medium'],
  'UPS': ['industrial-medium', 'asset-tag'],
  'Firewall': ['industrial-medium', 'asset-tag'],
  'Access Point': ['network-equipment', 'vinyl-small'],
  'Cable': ['cable-label'],
  'Adapter': ['cable-label', 'vinyl-small']
};
