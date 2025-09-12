import { useState, useEffect, useCallback } from 'react';
import API from '../lib/axios';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Custom hook for audit logging functionality
 * @param {string} appId - The app ID for the current screen/module
 * @returns {Object} - Audit logging utilities and enabled events
 */
export const useAuditLog = (appId) => {
  const [enabledEvents, setEnabledEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const user = useAuthStore((state) => state.user);

  // Fetch enabled events for the app
  const fetchEnabledEvents = useCallback(async () => {
    if (!appId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await API.get(`/app-events/enabled/${appId}`);
      console.log('🔍 API Response:', response.data);
      if (response.data.success) {
        const events = response.data.data.enabled_events || [];
        console.log('📊 Loaded events:', events.length, events);
        setEnabledEvents(events);
      }
    } catch (err) {
      console.error('Error fetching enabled events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [appId]);

  // Record a user action
  const recordAction = useCallback(async (eventId, text, additionalData = {}) => {
    if (!appId || !eventId) {
      console.warn('Missing required parameters for audit logging:', { appId, eventId });
      return false;
    }

    // Check if the event is enabled
    const isEventEnabled = enabledEvents.some(event => event.event_id === eventId);
    if (!isEventEnabled) {
      console.log(`Event ${eventId} is not enabled for app ${appId}, skipping audit log`);
      return false;
    }

    // Get event data for dynamic description
    const eventData = enabledEvents.find(event => event.event_id === eventId);
    
    // Generate dynamic text if not provided
    let finalText = text;
    if (!finalText && eventData) {
      // Use a simple fallback description
      finalText = `${eventData.text || 'Event'}: ${additionalData.action || 'Action performed'}`;
    }

    try {
      const response = await API.post('/audit-logs/record', {
        app_id: appId,
        event_id: eventId,
        text: finalText,
        ...additionalData
      });

      if (response.data.success) {
        console.log('Audit log recorded successfully:', response.data.data);
        return true;
      }
    } catch (err) {
      console.error('Error recording audit action:', err);
      // Don't throw error to prevent breaking the main functionality
    }
    
    return false;
  }, [appId, enabledEvents]);

  // Check if an event is enabled
  const isEventEnabled = useCallback((eventId) => {
    return enabledEvents.some(event => event.event_id === eventId);
  }, [enabledEvents]);

  // Get event details by ID
  const getEventDetails = useCallback((eventId) => {
    return enabledEvents.find(event => event.event_id === eventId);
  }, [enabledEvents]);

  // Get event ID by name
  const getEventIdByName = useCallback((eventName) => {
    const event = enabledEvents.find(e => 
      e.text && e.text.toLowerCase() === eventName.toLowerCase()
    );
    return event ? event.event_id : null;
  }, [enabledEvents]);

  // Record action by event name (dynamic)
  const recordActionByName = useCallback(async (eventName, additionalData = {}) => {
    // Don't record if still loading events
    if (loading) {
      console.log(`Events still loading, skipping audit log for "${eventName}"`);
      return false;
    }
    
    // Don't record if no events loaded
    if (enabledEvents.length === 0) {
      console.log(`No enabled events loaded, skipping audit log for "${eventName}"`);
      return false;
    }
    
    const eventId = getEventIdByName(eventName);
    if (!eventId) {
      console.warn(`Event "${eventName}" not found in enabled events for app ${appId}`);
      console.log('Available events:', enabledEvents.map(e => e.text));
      return false;
    }
    
    return await recordAction(eventId, null, additionalData);
  }, [getEventIdByName, recordAction, appId, loading, enabledEvents]);

  // Generate clean audit text without timestamps
  const generateCleanAuditText = (eventName, additionalData = {}) => {
    // Remove timestamp and other metadata from additionalData
    const { timestamp, action, ...cleanData } = additionalData;
    
    // Create meaningful text based on event and data
    let text = eventName;
    
    if (action) {
      text += `: ${action}`;
    }
    
    if (cleanData.assetId) {
      text += ` - Asset: ${cleanData.assetId}`;
    }
    
    if (cleanData.assetIds && Array.isArray(cleanData.assetIds)) {
      text += ` - Assets: ${cleanData.assetIds.join(', ')}`;
    }
    
    if (cleanData.count) {
      text += ` (${cleanData.count} items)`;
    }
    
    // Note: File names removed from text to keep it shorter
    
    if (cleanData.serialNumber) {
      text += ` (Serial: ${cleanData.serialNumber})`;
    }
    
    return text;
  };

  // Record action by event name with fresh data fetch (fallback)
  const recordActionByNameWithFetch = useCallback(async (eventName, additionalData = {}) => {
    try {
      // Fetch events fresh to avoid race condition
      const response = await API.get(`/app-events/enabled/${appId}`);
      if (!response.data.success) {
        console.warn('Failed to fetch events for audit logging');
        return false;
      }
      
      const events = response.data.data.enabled_events || [];
      const event = events.find(e => 
        e.text && e.text.toLowerCase() === eventName.toLowerCase()
      );
      
      if (!event) {
        console.warn(`Event "${eventName}" not found in enabled events for app ${appId}`);
        console.log('Available events:', events.map(e => e.text));
        return false;
      }
      
      // Generate clean text without timestamps (created_on field handles timing)
      const cleanText = generateCleanAuditText(eventName, additionalData);
      
      // Call audit log API directly to avoid state race condition
      const auditResponse = await API.post('/audit-logs/record', {
        app_id: appId,
        event_id: event.event_id,
        text: cleanText,
        ...additionalData
      });
      
      if (auditResponse.data.success) {
        console.log('✅ Audit log recorded successfully:', auditResponse.data.data);
        return true;
      } else {
        console.warn('Failed to record audit log:', auditResponse.data.message);
        return false;
      }
    } catch (error) {
      console.error('Error recording audit log:', error);
      return false;
    }
  }, [appId]);

  // Get all event names
  const getEventNames = useCallback(() => {
    return enabledEvents.map(e => e.text).filter(Boolean);
  }, [enabledEvents]);

  // Initialize enabled events on mount
  useEffect(() => {
    fetchEnabledEvents();
  }, [fetchEnabledEvents]);

  return {
    enabledEvents,
    loading,
    error,
    recordAction,
    recordActionByName,
    recordActionByNameWithFetch,
    isEventEnabled,
    getEventDetails,
    getEventIdByName,
    getEventNames,
    refetchEvents: fetchEnabledEvents
  };
};

export default useAuditLog;
