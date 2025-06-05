import { useState, useEffect } from 'react';

// Interface for usage data
interface UsageData {
  count: number;
  lastReset: number; // timestamp
  deviceId: string;
}

// Simple hash function (FNV-1a)
const hashString = (str: string): string => {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16); // Convert to unsigned 32-bit integer and then to hex
};

// Generate a device fingerprint based on browser properties
const generateDeviceFingerprint = (): string => {
  if (typeof window === 'undefined') return '';
  
  // Collect various device properties
  const screen = {
    width: window.screen.width,
    height: window.screen.height,
    colorDepth: window.screen.colorDepth,
    pixelDepth: window.screen.pixelDepth,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight,
  };
  
  const navigator = {
    language: window.navigator.language,
    languages: window.navigator.languages,
    userAgent: window.navigator.userAgent,
    platform: window.navigator.platform,
    vendor: window.navigator.vendor,
    doNotTrack: window.navigator.doNotTrack,
    cookieEnabled: window.navigator.cookieEnabled,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
  };
  
  // Add any additional hardware or software info available
  const additional = {
    hardwareConcurrency: window.navigator.hardwareConcurrency,
    deviceMemory: (window.navigator as any).deviceMemory,
    touchPoints: window.navigator.maxTouchPoints,
    devicePixelRatio: window.devicePixelRatio,
  };
  
  // Simple canvas fingerprinting
  let canvasFingerprint = '';
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 50;
      
      // Draw text with specific styling
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Fingerprint', 2, 15);
      
      canvasFingerprint = canvas.toDataURL().substring(0, 50);
    }
  } catch (e) {
    canvasFingerprint = 'canvas-not-supported';
  }
  
  // Combine all values and hash them
  const fingerprint = JSON.stringify({ 
    screen, 
    navigator, 
    additional, 
    canvas: canvasFingerprint,
    // Add date characteristics (not the actual date)
    dateInfo: {
      timezoneOffset: new Date().getTimezoneOffset(),
      timezoneString: new Date().toString().substring(0, 50),
    }
  });
  
  // Use our simple hash function
  return hashString(fingerprint);
};

// IndexedDB helper with proper error handling
const IndexedDBHelper = {
  dbName: "AnonymousUsageDB",
  storeName: "usageData",
  version: 1,

  openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = window.indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  },

  async set(key: string, value: string): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.put(value, key);
      
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.warn('IndexedDB set failed:', error);
    }
  },

  async get(key: string): Promise<string | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('IndexedDB get failed:', error);
      return null;
    }
  }
};

// Multi-storage for redundancy
const MultiStorage = {
  set: (key: string, value: string): void => {
    // Set in localStorage
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('LocalStorage not available:', e);
    }
    
    // Set in sessionStorage as backup
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {
      console.warn('SessionStorage not available:', e);
    }
    
    // Set in cookies (expires in 90 days)
    try {
      const expires = new Date();
      expires.setDate(expires.getDate() + 90);
      document.cookie = `${key}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
    } catch (e) {
      console.warn('Cookies not available:', e);
    }
    
    // Set in IndexedDB if available (async)
    IndexedDBHelper.set(key, value).catch(e => {
      console.warn('IndexedDB set failed:', e);
    });
  },
  
  get: (key: string): string | null => {
    let value = null;
    
    // Try localStorage first
    try {
      value = localStorage.getItem(key);
      if (value) return value;
    } catch (e) {
      console.warn('LocalStorage not accessible:', e);
    }
    
    // Try sessionStorage
    try {
      value = sessionStorage.getItem(key);
      if (value) return value;
    } catch (e) {
      console.warn('SessionStorage not accessible:', e);
    }
    
    // Try cookies
    try {
      const cookieMatch = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${key}=`));
      if (cookieMatch) {
        value = decodeURIComponent(cookieMatch.split('=')[1]);
        if (value) return value;
      }
    } catch (e) {
      console.warn('Cookies not accessible:', e);
    }
    
    // Try IndexedDB last (async, will update later if found)
    IndexedDBHelper.get(key).then(result => {
      if (result) {
        // We found the value in IndexedDB, restore it to other storages
        MultiStorage.set(key, result);
      }
    }).catch(e => {
      console.warn('IndexedDB get failed:', e);
    });
    
    return value;
  }
};

// Hook to track anonymous usage with device fingerprinting
export const useAnonymousUsage = (usageKey = 'anonymous_article_usage') => {
  const [usageData, setUsageData] = useState<UsageData>({
    count: 0,
    lastReset: Date.now(),
    deviceId: '',
  });

  // Load or initialize usage data
  useEffect(() => {
    // Generate device fingerprint
    const deviceId = generateDeviceFingerprint();
    
    // Try to load from MultiStorage
    try {
      const storedDataJson = MultiStorage.get(usageKey);
      if (storedDataJson) {
        const parsedData: UsageData = JSON.parse(storedDataJson);
        
        // Check if we need to reset (30 days passed)
        const daysSinceReset = (Date.now() - parsedData.lastReset) / (1000 * 60 * 60 * 24);
        if (daysSinceReset >= 30) {
          const newUsageData = {
            count: 0,
            lastReset: Date.now(),
            deviceId, // Update with current fingerprint
          };
          setUsageData(newUsageData);
          MultiStorage.set(usageKey, JSON.stringify(newUsageData));
        } else {
          // Use stored data, but update the device ID to latest
          const updatedData = {
            ...parsedData,
            deviceId, // Keep current fingerprint
          };
          setUsageData(updatedData);
          MultiStorage.set(usageKey, JSON.stringify(updatedData));
        }
        return;
      }
      
      // Initialize new usage data with the device fingerprint
      const newUsageData: UsageData = {
        count: 0,
        lastReset: Date.now(),
        deviceId,
      };
      setUsageData(newUsageData);
      MultiStorage.set(usageKey, JSON.stringify(newUsageData));
    } catch (err) {
      console.error('Error managing anonymous usage data:', err);
      // Fallback to new usage data
      const newUsageData: UsageData = {
        count: 0,
        lastReset: Date.now(),
        deviceId,
      };
      setUsageData(newUsageData);
    }
  }, [usageKey]);

  // Function to increment usage count
  const incrementUsage = () => {
    const updatedData = {
      ...usageData,
      count: usageData.count + 1,
    };
    setUsageData(updatedData);
    
    try {
      MultiStorage.set(usageKey, JSON.stringify(updatedData));
    } catch (err) {
      console.error('Error saving usage data:', err);
    }
    
    return updatedData.count;
  };

  // Function to reset usage count
  const resetUsage = () => {
    const updatedData = {
      ...usageData,
      count: 0,
      lastReset: Date.now(),
    };
    setUsageData(updatedData);
    
    try {
      MultiStorage.set(usageKey, JSON.stringify(updatedData));
    } catch (err) {
      console.error('Error resetting usage data:', err);
    }
  };

  return {
    usageCount: usageData.count,
    deviceId: usageData.deviceId,
    lastReset: usageData.lastReset,
    incrementUsage,
    resetUsage,
  };
}; 