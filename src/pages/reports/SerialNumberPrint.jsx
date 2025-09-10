import React, { useState, useEffect, useRef } from 'react';
import { 
  Filter, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  MapPin,
  Settings,
  FileText,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../lib/axios';
import ContentBox from '../../components/ContentBox';
import CustomTable from '../../components/CustomTable';
import PrintLabelScreen from '../../components/PrintLabelScreen';
import SearchableDropdown from '../../components/ui/SearchableDropdown';

const SerialNumberPrint = () => {
  // State management
  const [printQueue, setPrintQueue] = useState([]);
  const [filteredQueue, setFilteredQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showPrintPage, setShowPrintPage] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    status: 'New', // Default to New status
    assetType: '',
    location: '',
    priority: '',
    department: ''
  });

  // Printer and status options
  const [printers, setPrinters] = useState([
    { id: 1, name: 'Main Office Laser Printer', location: 'Main Office - Floor 1', ipAddress: '192.168.1.100', status: 'Online', type: 'Laser', paperSize: 'A4' },
    { id: 2, name: 'Warehouse Label Printer', location: 'Warehouse A - Storage', ipAddress: '192.168.1.101', status: 'Online', type: 'Label', paperSize: '4x6' },
    { id: 3, name: 'Production Floor Printer', location: 'Production Floor - Line 1', ipAddress: '192.168.1.102', status: 'Offline', type: 'Industrial', paperSize: 'A3' },
    { id: 4, name: 'Admin Office Printer', location: 'Admin Office - HR', ipAddress: '192.168.1.103', status: 'Online', type: 'Multifunction', paperSize: 'A4' },
    { id: 5, name: 'IT Department Printer', location: 'Admin Office - IT', ipAddress: '192.168.1.104', status: 'Online', type: 'Laser', paperSize: 'A4' },
    { id: 6, name: 'Conference Room Printer', location: 'Conference Room A', ipAddress: '192.168.1.105', status: 'Online', type: 'Inkjet', paperSize: 'A4' },
    { id: 7, name: 'Lab Printer', location: 'Lab - Testing', ipAddress: '192.168.1.106', status: 'Online', type: 'Laser', paperSize: 'A4' },
    { id: 8, name: 'Security Office Printer', location: 'Security Office', ipAddress: '192.168.1.107', status: 'Maintenance', type: 'Laser', paperSize: 'A4' },
    { id: 9, name: 'Warehouse B Printer', location: 'Warehouse B - Receiving', ipAddress: '192.168.1.108', status: 'Online', type: 'Label', paperSize: '3x2' },
    { id: 10, name: 'Production Line 2 Printer', location: 'Production Floor - Line 2', ipAddress: '192.168.1.109', status: 'Online', type: 'Industrial', paperSize: 'A2' }
  ]);

  // Asset type templates with specific label requirements
  const assetTemplates = {
    'Laptop': {
      labelSize: '4x2',
      paperType: 'Vinyl',
      paperQuality: 'High',
      template: 'laptop-template',
      description: 'Durable vinyl labels for laptop serial numbers'
    },
    'Desktop Computer': {
      labelSize: '3x1.5',
      paperType: 'Paper',
      paperQuality: 'High',
      template: 'desktop-template',
      description: 'Paper labels for desktop computer identification'
    },
    'Printer': {
      labelSize: '2x1',
      paperType: 'Paper',
      paperQuality: 'Normal',
      template: 'printer-template',
      description: 'Standard paper labels for printer equipment'
    },
    'Scanner': {
      labelSize: '2x1',
      paperType: 'Paper',
      paperQuality: 'Normal',
      template: 'scanner-template',
      description: 'Standard paper labels for scanner equipment'
    },
    'Monitor': {
      labelSize: '3x1',
      paperType: 'Vinyl',
      paperQuality: 'High',
      template: 'monitor-template',
      description: 'Vinyl labels for monitor identification'
    },
    'Server': {
      labelSize: '4x2',
      paperType: 'Metal',
      paperQuality: 'High',
      template: 'server-template',
      description: 'Metal labels for server equipment identification'
    },
    'Router': {
      labelSize: '1.5x0.75',
      paperType: 'Vinyl',
      paperQuality: 'High',
      template: 'router-template',
      description: 'Small vinyl labels for network equipment'
    },
    'Switch': {
      labelSize: '1.5x0.75',
      paperType: 'Vinyl',
      paperQuality: 'High',
      template: 'switch-template',
      description: 'Small vinyl labels for network switches'
    },
    'Projector': {
      labelSize: '3x1.5',
      paperType: 'Paper',
      paperQuality: 'High',
      template: 'projector-template',
      description: 'Paper labels for projector equipment'
    },
    'Camera': {
      labelSize: '2x1',
      paperType: 'Vinyl',
      paperQuality: 'High',
      template: 'camera-template',
      description: 'Vinyl labels for camera equipment'
    },
    'Keyboard': {
      labelSize: '2x1',
      paperType: 'Paper',
      paperQuality: 'Normal',
      template: 'keyboard-template',
      description: 'Paper labels for keyboard equipment'
    },
    'Mouse': {
      labelSize: '1.5x0.75',
      paperType: 'Paper',
      paperQuality: 'Normal',
      template: 'mouse-template',
      description: 'Small paper labels for mouse equipment'
    },
    'Tablet': {
      labelSize: '3x1.5',
      paperType: 'Vinyl',
      paperQuality: 'High',
      template: 'tablet-template',
      description: 'Vinyl labels for tablet devices'
    },
    'Phone': {
      labelSize: '2x1',
      paperType: 'Vinyl',
      paperQuality: 'High',
      template: 'phone-template',
      description: 'Vinyl labels for phone devices'
    },
    'Headset': {
      labelSize: '2x1',
      paperType: 'Paper',
      paperQuality: 'Normal',
      template: 'headset-template',
      description: 'Paper labels for headset equipment'
    },
    'External Drive': {
      labelSize: '2x1',
      paperType: 'Vinyl',
      paperQuality: 'High',
      template: 'drive-template',
      description: 'Vinyl labels for external drives'
    },
    'UPS': {
      labelSize: '3x1.5',
      paperType: 'Metal',
      paperQuality: 'High',
      template: 'ups-template',
      description: 'Metal labels for UPS equipment'
    },
    'Firewall': {
      labelSize: '3x1',
      paperType: 'Metal',
      paperQuality: 'High',
      template: 'firewall-template',
      description: 'Metal labels for firewall equipment'
    },
    'Access Point': {
      labelSize: '2x1',
      paperType: 'Vinyl',
      paperQuality: 'High',
      template: 'ap-template',
      description: 'Vinyl labels for access points'
    },
    'Cable': {
      labelSize: '1.5x0.75',
      paperType: 'Paper',
      paperQuality: 'Normal',
      template: 'cable-template',
      description: 'Small paper labels for cables'
    },
    'Adapter': {
      labelSize: '1.5x0.75',
      paperType: 'Paper',
      paperQuality: 'Normal',
      template: 'adapter-template',
      description: 'Small paper labels for adapters'
    }
  };

  // Print settings state
  const [printSettings, setPrintSettings] = useState({
    printerId: '',
    printerType: '',
    dimension: ''
  });


  const statusOptions = [
    { id: 'New', name: 'New', color: 'bg-blue-100 text-blue-800' },
    { id: 'In-progress', name: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'Completed', name: 'Completed', color: 'bg-green-100 text-green-800' },
    { id: 'Cancelled', name: 'Cancelled', color: 'bg-red-100 text-red-800' }
  ];

  // Table columns
  const columns = [
    { name: 'serial_number', label: 'Serial Number', visible: true },
    { name: 'asset_type_name', label: 'Asset Type', visible: true },
    { name: 'asset_name', label: 'Asset Name', visible: true },
    { name: 'asset_description', label: 'Description', visible: true },
    { name: 'asset_location', label: 'Location', visible: true },
    { name: 'reason', label: 'Reason', visible: true },
    { name: 'priority', label: 'Priority', visible: true },
    { name: 'department', label: 'Department', visible: true },
    { name: 'status', label: 'Status', visible: true },
    { name: 'created_at', label: 'Created Date', visible: true },
    { name: 'created_by', label: 'Created By', visible: false },
    { name: 'estimated_cost', label: 'Est. Cost', visible: false },
    { name: 'actions', label: 'Actions', visible: true }
  ];

  // Fetch print queue data
  useEffect(() => {
    fetchPrintQueue();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [filters, printQueue]);

  const fetchPrintQueue = async () => {
    setIsLoading(true);
    try {
      // For now, always use mock data for demonstration
      // TODO: Replace with actual API call when backend is ready
      const mockData = generateMockPrintQueue();
      console.log('Generated mock data:', mockData.length, 'items');
      setPrintQueue(mockData);
      
      // Uncomment below when API is ready:
      // const response = await API.get('/serial-numbers/print-queue', {
      //   params: { status: filters.status }
      // });
      // 
      // if (response.data && response.data.success) {
      //   setPrintQueue(response.data.data);
      // } else {
      //   setPrintQueue(generateMockPrintQueue());
      // }
    } catch (error) {
      console.error('Error fetching print queue:', error);
      // Use mock data on error
      setPrintQueue(generateMockPrintQueue());
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockPrintQueue = () => {
    const mockData = [];
    
    // More comprehensive asset types
    const assetTypes = [
      'Laptop', 'Desktop Computer', 'Printer', 'Scanner', 'Tablet', 
      'Monitor', 'Keyboard', 'Mouse', 'Router', 'Switch', 'Server',
      'Projector', 'Camera', 'Phone', 'Headset', 'External Drive',
      'UPS', 'Firewall', 'Access Point', 'Cable', 'Adapter'
    ];
    
    // More detailed locations
    const locations = [
      'Main Office - Floor 1', 'Main Office - Floor 2', 'Main Office - Floor 3',
      'Warehouse A - Storage', 'Warehouse B - Receiving', 'Warehouse C - Shipping',
      'Production Floor - Line 1', 'Production Floor - Line 2', 'Production Floor - Line 3',
      'Admin Office - HR', 'Admin Office - Finance', 'Admin Office - IT',
      'Conference Room A', 'Conference Room B', 'Meeting Room 1',
      'Lab - Testing', 'Lab - Development', 'Lab - Quality Control',
      'Reception Area', 'Security Office', 'Maintenance Room'
    ];
    
    // More specific reasons
    const reasons = [
      'New Asset Purchase', 'Asset Replacement', 'Maintenance Required', 
      'Upgrade Needed', 'Warranty Claim', 'Damage Repair', 'End of Life',
      'Department Transfer', 'Employee Assignment', 'Project Allocation',
      'Backup Equipment', 'Emergency Replacement', 'Seasonal Requirement',
      'Compliance Update', 'Technology Refresh', 'Capacity Expansion'
    ];
    
    // Status distribution (more realistic)
    const statusDistribution = [
      { status: 'New', weight: 40 },
      { status: 'In-progress', weight: 25 },
      { status: 'Completed', weight: 30 },
      { status: 'Cancelled', weight: 5 }
    ];
    
    // Generate weighted random status
    const getRandomStatus = () => {
      const random = Math.random() * 100;
      let cumulative = 0;
      for (const item of statusDistribution) {
        cumulative += item.weight;
        if (random <= cumulative) {
          return item.status;
        }
      }
      return 'New';
    };
    
    // More detailed asset names and descriptions
    const assetNameTemplates = {
      'Laptop': ['Dell Latitude 5520', 'HP EliteBook 850', 'Lenovo ThinkPad X1', 'MacBook Pro 16"', 'Surface Laptop 4'],
      'Desktop Computer': ['Dell OptiPlex 7090', 'HP ProDesk 400', 'Lenovo ThinkCentre M920', 'iMac 24"', 'Custom Build PC'],
      'Printer': ['HP LaserJet Pro 400', 'Canon imageCLASS LBP', 'Brother HL-L2350DW', 'Epson WorkForce Pro', 'Xerox Phaser 6510'],
      'Scanner': ['HP ScanJet Pro 2500', 'Canon CanoScan LiDE 400', 'Epson Perfection V600', 'Fujitsu ScanSnap iX1500', 'Brother MFC-L2750DW'],
      'Monitor': ['Dell UltraSharp 27"', 'HP EliteDisplay E243', 'Samsung 24" LED', 'LG 27" 4K', 'ASUS ProArt PA248QV'],
      'Server': ['Dell PowerEdge R750', 'HP ProLiant DL380', 'Lenovo ThinkSystem SR650', 'IBM System x3650', 'Supermicro SuperServer'],
      'Router': ['Cisco ISR 4331', 'Netgear Nighthawk X10', 'TP-Link Archer C9', 'Ubiquiti EdgeRouter X', 'Fortinet FortiGate 60E'],
      'Switch': ['Cisco Catalyst 2960', 'Netgear ProSAFE GS728TP', 'TP-Link T1600G-28TS', 'Ubiquiti UniFi Switch', 'HP ProCurve 2520'],
      'Projector': ['Epson PowerLite 1781W', 'BenQ MW632ST', 'Optoma HD146X', 'ViewSonic PA503X', 'Sony VPL-FHZ75'],
      'Camera': ['Canon EOS R5', 'Sony A7R IV', 'Nikon D850', 'Panasonic Lumix GH5', 'Fujifilm X-T4']
    };
    
    const assetDescriptions = {
      'Laptop': [
        'High-performance business laptop with Intel i7 processor, 16GB RAM, and 512GB SSD',
        'Ultra-portable laptop with long battery life and premium build quality',
        'Gaming laptop with dedicated graphics card and high-refresh display',
        'Convertible 2-in-1 laptop with touchscreen and stylus support',
        'Enterprise laptop with enhanced security features and manageability'
      ],
      'Desktop Computer': [
        'High-end workstation with Intel i9 processor, 32GB RAM, and 1TB NVMe SSD',
        'Compact desktop with energy-efficient components and quiet operation',
        'Gaming desktop with RTX graphics card and liquid cooling',
        'All-in-one desktop with integrated display and wireless peripherals',
        'Server-grade desktop with ECC memory and redundant storage'
      ],
      'Printer': [
        'High-speed laser printer with duplex printing and network connectivity',
        'Color laser printer with automatic document feeder and finishing options',
        'Inkjet printer with photo-quality printing and wireless connectivity',
        'Multifunction printer with scan, copy, and fax capabilities',
        'Large format printer for architectural and engineering drawings'
      ],
      'Scanner': [
        'High-resolution flatbed scanner with automatic document feeder',
        'Portable document scanner with battery operation and wireless transfer',
        'Sheet-fed scanner with duplex scanning and OCR capabilities',
        'Film scanner for 35mm negatives and slides with dust removal',
        '3D scanner for creating digital models of physical objects'
      ]
    };
    
    // Generate 50 items for better testing
    for (let i = 0; i < 50; i++) {
      const randomDate = new Date();
      randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 90)); // Last 3 months
      
      const assetType = assetTypes[Math.floor(Math.random() * assetTypes.length)];
      const nameTemplates = assetNameTemplates[assetType] || [`${assetType} Model ${i + 1}`];
      const descriptions = assetDescriptions[assetType] || [`Professional ${assetType.toLowerCase()} for office use`];
      
      // Generate realistic serial number based on asset type
      const typeCode = assetType.substring(0, 2).toUpperCase().padStart(2, '0');
      const year = (new Date().getFullYear() - Math.floor(Math.random() * 3)).toString().slice(-2);
      const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
      const sequence = String(i + 1).padStart(5, '0');
      const serialNumber = `${typeCode}${year}${month}${sequence}`;
      
      mockData.push({
        psnq_id: i + 1,
        serial_number: serialNumber,
        asset_type_name: assetType,
        asset_name: nameTemplates[Math.floor(Math.random() * nameTemplates.length)],
        asset_description: descriptions[Math.floor(Math.random() * descriptions.length)],
        asset_location: locations[Math.floor(Math.random() * locations.length)],
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        status: getRandomStatus(),
        created_at: randomDate.toISOString(),
        created_by: ['admin', 'manager1', 'supervisor', 'technician', 'user1'][Math.floor(Math.random() * 5)],
        priority: ['Low', 'Medium', 'High', 'Critical'][Math.floor(Math.random() * 4)],
        estimated_cost: Math.floor(Math.random() * 5000) + 100,
        department: ['IT', 'Finance', 'HR', 'Operations', 'Maintenance', 'Security'][Math.floor(Math.random() * 6)]
      });
    }
    
    // Sort by created date (newest first)
    return mockData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const applyFilters = () => {
    let filtered = [...printQueue];
    console.log('Applying filters. Original data:', printQueue.length, 'items');
    console.log('Current filters:', filters);

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(item => item.status === filters.status);
      console.log('After status filter:', filtered.length, 'items');
    }

    // Filter by asset type
    if (filters.assetType) {
      filtered = filtered.filter(item => 
        item.asset_type_name.toLowerCase().includes(filters.assetType.toLowerCase())
      );
      console.log('After asset type filter:', filtered.length, 'items');
    }

    // Filter by location
    if (filters.location) {
      filtered = filtered.filter(item => 
        item.asset_location.toLowerCase().includes(filters.location.toLowerCase())
      );
      console.log('After location filter:', filtered.length, 'items');
    }

    // Filter by priority
    if (filters.priority) {
      filtered = filtered.filter(item => item.priority === filters.priority);
      console.log('After priority filter:', filtered.length, 'items');
    }

    // Filter by department
    if (filters.department) {
      filtered = filtered.filter(item => 
        item.department.toLowerCase().includes(filters.department.toLowerCase())
      );
      console.log('After department filter:', filtered.length, 'items');
    }

    console.log('Final filtered data:', filtered.length, 'items');
    setFilteredQueue(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    // Auto-select recommended printer
    const recommendedPrinter = getRecommendedPrinter(item);
    const template = assetTemplates[item.asset_type_name] || assetTemplates['Laptop'];
    
    setPrintSettings({
      printerId: recommendedPrinter.id.toString(),
      printerType: recommendedPrinter.type,
      dimension: template.labelSize
    });
    setShowPrintPage(true);
  };

  const handleStatusUpdate = (item) => {
    setSelectedItem(item);
    setShowStatusModal(true);
  };

  const handleBackToList = () => {
    setShowPrintPage(false);
    setSelectedItem(null);
    setPrintSettings({ printerId: '', printerType: '', dimension: '' });
  };

  const handlePreview = () => {
    if (!selectedItem || !printSettings.printerId || !printSettings.printerType || !printSettings.dimension) {
      toast.error('Please select printer name, type, and dimension');
      return;
    }
    setShowPreviewModal(true);
  };

  const handlePrint = async () => {
    if (!selectedItem || !printSettings.printerId || !printSettings.printerType || !printSettings.dimension) {
      toast.error('Please select printer name, type, and dimension');
      return;
    }

    try {
      // Get selected printer
      const selectedPrinter = printers.find(p => p.id === parseInt(printSettings.printerId));
      if (!selectedPrinter) {
        toast.error('Selected printer not found');
        return;
      }

      // Get asset template
      const template = assetTemplates[selectedItem.asset_type_name] || assetTemplates['Laptop'];
      
      // Simulate print process
      toast.loading('Generating PDF and sending to printer...', { duration: 3000 });
      
      // Update status to In-progress
      await updateItemStatus(selectedItem.psnq_id, 'In-progress');
      
      // Generate PDF with asset-specific template
      await generatePDF(selectedItem, template, selectedPrinter);
      
      // Simulate print delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Print job sent to ${selectedPrinter.name} successfully!`);
      handleBackToList();
      fetchPrintQueue();
    } catch (error) {
      console.error('Error printing:', error);
      toast.error('Failed to send print job');
    }
  };

  const generatePDF = async (asset, template, printer) => {
    // Determine label format based on printer type and asset template
    const getLabelFormat = (printerType, paperType) => {
      if (printerType === 'Label' && paperType === 'Vinyl') return 'Barcode';
      if (printerType === 'Industrial' && paperType === 'Metal') return 'QR Code';
      if ((printerType === 'Laser' || printerType === 'Inkjet') && paperType === 'Paper') return 'Text Only';
      return 'Barcode';
    };

    const labelFormat = getLabelFormat(printSettings.printerType, template.paperType);
    
    console.log('Generating PDF with template:', template.template);
    console.log('Label format:', labelFormat);
    console.log('Asset details:', {
      serialNumber: asset.serial_number,
      assetType: asset.asset_type_name,
      assetName: asset.asset_name,
      location: asset.asset_location
    });
    console.log('Print settings:', {
      printer: printer.name,
      location: printer.location,
      ipAddress: printer.ipAddress,
      printerType: printSettings.printerType,
      dimension: printSettings.dimension,
      labelSize: template.labelSize,
      paperType: template.paperType,
      paperQuality: template.paperQuality
    });

    // In a real implementation, this would:
    // 1. Generate real barcode using JsBarcode library (Code128 format)
    // 2. Generate real QR code using QRCode library
    // 3. Create PDF with the appropriate label format:
    //    - Barcode: Linear barcode + serial number below
    //    - QR Code: QR code + serial number below  
    //    - Text Only: Serial number + asset details
    // 4. Apply correct label size, paper type, and quality
    // 5. Send the PDF to the selected printer
    
    // For now, simulate the process
    await new Promise(resolve => setTimeout(resolve, 1500));
  };

  const getRecommendedPrinter = (asset) => {
    // Get printers that match the asset's location
    const locationMatch = printers.filter(printer => 
      printer.location.toLowerCase().includes(asset.asset_location.toLowerCase()) ||
      asset.asset_location.toLowerCase().includes(printer.location.toLowerCase())
    );

    // Get printers that match the asset type requirements
    const template = assetTemplates[asset.asset_type_name] || assetTemplates['Laptop']; // Default to Laptop template if not found
    const typeMatch = printers.filter(printer => {
      if (template && template.paperType === 'Vinyl' && printer.type === 'Label') return true;
      if (template && template.paperType === 'Paper' && (printer.type === 'Laser' || printer.type === 'Inkjet')) return true;
      if (template && template.paperType === 'Metal' && printer.type === 'Industrial') return true;
      return false;
    });

    // Return the best match
    if (locationMatch.length > 0) return locationMatch[0];
    if (typeMatch.length > 0) return typeMatch[0];
    return printers.find(p => p.status === 'Online') || printers[0];
  };

  // Get available printer types based on asset template
  const getAvailablePrinterTypes = (asset) => {
    const template = assetTemplates[asset.asset_type_name] || assetTemplates['Laptop'];
    const availableTypes = [];
    
    if (template.paperType === 'Vinyl') {
      availableTypes.push('Label');
    }
    if (template.paperType === 'Paper') {
      availableTypes.push('Laser', 'Inkjet');
    }
    if (template.paperType === 'Metal') {
      availableTypes.push('Industrial');
    }
    
    // Always include all types as fallback
    const allTypes = [...new Set([...availableTypes, 'Laser', 'Inkjet', 'Label', 'Industrial', 'Multifunction'])];
    return allTypes;
  };

  // Get available dimensions based on asset template
  const getAvailableDimensions = (asset) => {
    const template = assetTemplates[asset.asset_type_name] || assetTemplates['Laptop'];
    const availableDimensions = [template.labelSize];
    
    // Add common dimensions as fallback
    const commonDimensions = ['2x1', '3x1', '3x1.5', '3x2', '4x2', '4x6', 'A4', 'A3', 'A2'];
    return [...new Set([...availableDimensions, ...commonDimensions])];
  };

  // Get filtered printers based on selected type and dimension
  const getFilteredPrinters = () => {
    if (!selectedItem) return printers;
    
    return printers.filter(printer => {
      const typeMatch = !printSettings.printerType || printer.type === printSettings.printerType;
      const dimensionMatch = !printSettings.dimension || printer.paperSize === printSettings.dimension;
      return typeMatch && dimensionMatch;
    });
  };

  // Generate preview content for the label
  const generatePreviewContent = () => {
    if (!selectedItem || !printSettings.printerId) return null;
    
    const selectedPrinter = printers.find(p => p.id === parseInt(printSettings.printerId));
    const template = assetTemplates[selectedItem.asset_type_name] || assetTemplates['Laptop'];
    
    return {
      asset: selectedItem,
      printer: selectedPrinter,
      template: template,
      settings: printSettings
    };
  };

  const updateItemStatus = async (psnqId, status) => {
    try {
      await API.put(`/serial-numbers/print-queue/${psnqId}/status`, {
        status,
        orgId: 'ORG001'
      });
      
      // Update local state
      setPrintQueue(prev => 
        prev.map(item => 
          item.psnq_id === psnqId ? { ...item, status } : item
        )
      );
      
      toast.success(`Status updated to ${status}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'New': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'In-progress': return <RefreshCw className="w-4 h-4 text-yellow-600" />;
      case 'Completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Cancelled': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadgeColor = (status) => {
    const statusOption = statusOptions.find(s => s.id === status);
    return statusOption ? statusOption.color : 'bg-gray-100 text-gray-800';
  };

  // Custom render functions
  const renderSerialNumber = (col, row) => {
    if (col.name === 'serial_number') {
      return (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <span className="font-mono text-sm font-medium">{row.serial_number}</span>
        </div>
      );
    }
    return row[col.name];
  };

  const renderStatus = (col, row) => {
    if (col.name === 'status') {
      return (
        <div className="flex items-center gap-2">
          {getStatusIcon(row.status)}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(row.status)}`}>
            {row.status}
          </span>
        </div>
      );
    }
    return row[col.name];
  };

  const renderLocation = (col, row) => {
    if (col.name === 'asset_location') {
      return (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-500" />
          <span className="text-sm">{row.asset_location}</span>
        </div>
      );
    }
    return row[col.name];
  };

  const renderActions = (col, row) => {
    if (col.name === 'actions') {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleStatusUpdate(row)}
            className="flex items-center gap-1 px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
            title="Update Status"
          >
            <Settings className="w-3 h-3" />
            Status
          </button>
        </div>
      );
    }
    return row[col.name];
  };

  const renderCreatedDate = (col, row) => {
    if (col.name === 'created_at') {
      return new Date(row.created_at).toLocaleDateString();
    }
    return row[col.name];
  };

  const renderPriority = (col, row) => {
    if (col.name === 'priority') {
      const priorityColors = {
        'Low': 'bg-gray-100 text-gray-800',
        'Medium': 'bg-yellow-100 text-yellow-800',
        'High': 'bg-orange-100 text-orange-800',
        'Critical': 'bg-red-100 text-red-800'
      };
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[row.priority] || 'bg-gray-100 text-gray-800'}`}>
          {row.priority}
        </span>
      );
    }
    return row[col.name];
  };

  const renderDepartment = (col, row) => {
    if (col.name === 'department') {
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
          {row.department}
        </span>
      );
    }
    return row[col.name];
  };

  const renderEstimatedCost = (col, row) => {
    if (col.name === 'estimated_cost') {
      return `$${row.estimated_cost?.toLocaleString() || 'N/A'}`;
    }
    return row[col.name];
  };

  const renderCreatedBy = (col, row) => {
    if (col.name === 'created_by') {
      return (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
            {row.created_by?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-sm">{row.created_by}</span>
        </div>
      );
    }
    return row[col.name];
  };

  // Show print page if an item is selected
  if (showPrintPage && selectedItem) {
    return (
      <PrintLabelScreen
        selectedItem={selectedItem}
        onBackToList={handleBackToList}
        onStatusUpdate={handleStatusUpdate}
        onPreview={handlePreview}
        onPrint={handlePrint}
        printers={printers}
        assetTemplates={assetTemplates}
        printSettings={printSettings}
        setPrintSettings={setPrintSettings}
        getRecommendedPrinter={getRecommendedPrinter}
        getAvailablePrinterTypes={getAvailablePrinterTypes}
        getAvailableDimensions={getAvailableDimensions}
        getFilteredPrinters={getFilteredPrinters}
        getStatusBadgeColor={getStatusBadgeColor}
        showPreviewModal={showPreviewModal}
        setShowPreviewModal={setShowPreviewModal}
      />
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Serial Number Print</h1>
            <p className="text-gray-600 mt-1">Manage and print serial number labels for assets</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={fetchPrintQueue}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <SearchableDropdown
                options={statusOptions.map(status => ({
                  id: status.id,
                  text: status.name
                }))}
                value={filters.status}
                onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                placeholder="Select status..."
                className="w-full"
              />
            </div>

            {/* Asset Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asset Type
              </label>
              <input
                type="text"
                value={filters.assetType}
                onChange={(e) => handleFilterChange('assetType', e.target.value)}
                placeholder="Filter by asset type..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                placeholder="Filter by location..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <SearchableDropdown
                options={[
                  { id: '', text: 'All Priorities' },
                  { id: 'Low', text: 'Low' },
                  { id: 'Medium', text: 'Medium' },
                  { id: 'High', text: 'High' },
                  { id: 'Critical', text: 'Critical' }
                ]}
                value={filters.priority}
                onChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
                placeholder="Select priority..."
                className="w-full"
              />
            </div>

            {/* Department Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <SearchableDropdown
                options={[
                  { id: '', text: 'All Departments' },
                  { id: 'IT', text: 'IT' },
                  { id: 'Finance', text: 'Finance' },
                  { id: 'HR', text: 'HR' },
                  { id: 'Operations', text: 'Operations' },
                  { id: 'Maintenance', text: 'Maintenance' },
                  { id: 'Security', text: 'Security' }
                ]}
                value={filters.department}
                onChange={(value) => setFilters(prev => ({ ...prev, department: value }))}
                placeholder="Select department..."
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-sm">
              <span className="text-gray-600">Total Items:</span>
              <span className="font-semibold ml-1">{printQueue.length}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Filtered:</span>
              <span className="font-semibold ml-1">{filteredQueue.length}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Selected:</span>
              <span className="font-semibold ml-1">{selectedItems.length}</span>
            </div>
          </div>
          {isLoading && (
            <div className="flex items-center gap-2 text-blue-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          )}
        </div>
      </div>

      {/* ContentBox with CustomTable */}
      <ContentBox
        filters={columns}
        data={filteredQueue}
        selectedRows={selectedItems}
        setSelectedRows={setSelectedItems}
        showAddButton={false}
        showActions={false}
        showFilterButton={false}
      >
        {({ visibleColumns, showActions }) => (
          <CustomTable
            visibleColumns={visibleColumns}
            data={filteredQueue}
            selectedRows={selectedItems}
            setSelectedRows={setSelectedItems}
            showActions={false}
            onRowClick={handleSelectItem}
            rowClassName="hover:bg-blue-50 cursor-pointer transition-colors"
            renderCell={(col, row) => {
              if (col.name === 'serial_number') return renderSerialNumber(col, row);
              if (col.name === 'status') return renderStatus(col, row);
              if (col.name === 'asset_location') return renderLocation(col, row);
              if (col.name === 'actions') return renderActions(col, row);
              if (col.name === 'created_at') return renderCreatedDate(col, row);
              if (col.name === 'priority') return renderPriority(col, row);
              if (col.name === 'department') return renderDepartment(col, row);
              if (col.name === 'estimated_cost') return renderEstimatedCost(col, row);
              if (col.name === 'created_by') return renderCreatedBy(col, row);
              return row[col.name];
            }}
          />
        )}
      </ContentBox>


      {/* Status Update Modal */}
      {showStatusModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Update Print Request Status</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Serial Number: {selectedItem.serial_number}</p>
              <p className="text-sm text-gray-600 mb-2">Asset: {selectedItem.asset_name}</p>
              <p className="text-sm text-gray-600">Current Status: 
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(selectedItem.status)}`}>
                  {selectedItem.status}
                </span>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select New Status
              </label>
              <div className="space-y-2">
                {statusOptions.map(status => (
                  <button
                    key={status.id}
                    onClick={() => {
                      updateItemStatus(selectedItem.psnq_id, status.id);
                      setShowStatusModal(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                      selectedItem.status === status.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    disabled={selectedItem.status === status.id}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(status.id)}
                      <div>
                        <div className="font-medium">{status.name}</div>
                        <div className="text-xs text-gray-500">
                          {status.id === 'New' && 'New print request'}
                          {status.id === 'In-progress' && 'Currently being printed'}
                          {status.id === 'Completed' && 'Print job completed successfully'}
                          {status.id === 'Cancelled' && 'Print job cancelled'}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Empty State */}
      {!isLoading && filteredQueue.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No print queue items found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filters or check if there are items in the queue.
          </p>
        </div>
      )}

    </div>
  );
};

export default SerialNumberPrint;
