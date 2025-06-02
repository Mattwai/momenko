import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

interface NetworkMetrics {
  connectionType: string;
  isConnected: boolean;
  bandwidth: number; // Mbps
  latency: number; // ms
  reliability: number; // 0-100%
  dataUsage: number; // bytes
  timestamp: number;
}

interface QueuedRequest {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  priority: 'high' | 'medium' | 'low';
  retryCount: number;
  maxRetries: number;
  timeout: number;
  culturalContext?: string;
  timestamp: number;
}

interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  expiresAt: number;
  size: number;
  priority: 'high' | 'medium' | 'low';
  culturalContext?: string;
}

interface NetworkOptimizationConfig {
  maxRetries: number;
  baseTimeout: number;
  maxCacheSize: number; // MB
  compressionEnabled: boolean;
  offlineMode: boolean;
  adaptiveBandwidth: boolean;
  culturalContentPriority: boolean;
  elderlyOptimizations: boolean;
  dataUsageLimit: number; // MB per day
}

class NetworkOptimizer {
  private config: NetworkOptimizationConfig;
  private metrics: NetworkMetrics;
  private requestQueue: QueuedRequest[] = [];
  private cache: Map<string, CacheEntry> = new Map();
  private isOnline = true;
  private isProcessingQueue = false;
  private retryTimers: Map<string, NodeJS.Timeout> = new Map();
  private dailyDataUsage = 0;
  private lastDataReset = new Date().toDateString();

  constructor() {
    this.config = {
      maxRetries: 3,
      baseTimeout: 10000, // 10 seconds for elderly users
      maxCacheSize: 50, // 50MB cache
      compressionEnabled: true,
      offlineMode: false,
      adaptiveBandwidth: true,
      culturalContentPriority: true,
      elderlyOptimizations: true,
      dataUsageLimit: 100 // 100MB per day
    };

    this.metrics = {
      connectionType: 'unknown',
      isConnected: false,
      bandwidth: 0,
      latency: 0,
      reliability: 100,
      dataUsage: 0,
      timestamp: Date.now()
    };

    this.initializeNetworkMonitoring();
    this.loadCache();
    this.loadDataUsage();
  }

  private initializeNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      this.metrics = {
        connectionType: state.type || 'unknown',
        isConnected: this.isOnline,
        bandwidth: this.estimateBandwidth(state),
        latency: this.estimateLatency(state),
        reliability: this.calculateReliability(state),
        dataUsage: this.metrics.dataUsage,
        timestamp: Date.now()
      };

      // Handle connectivity changes
      if (!wasOnline && this.isOnline) {
        this.onConnectionRestored();
      } else if (wasOnline && !this.isOnline) {
        this.onConnectionLost();
      }

      // Adjust optimization settings
      this.adjustOptimizationSettings();
    });

    // Monitor data usage daily reset
    setInterval(() => {
      this.checkDataUsageReset();
    }, 3600000); // Check every hour
  }

  async makeRequest(
    url: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      data?: any;
      priority?: 'high' | 'medium' | 'low';
      culturalContext?: string;
      useCache?: boolean;
      timeout?: number;
    } = {}
  ): Promise<any> {
    const {
      method = 'GET',
      data,
      priority = 'medium',
      culturalContext,
      useCache = true,
      timeout = this.config.baseTimeout
    } = options;

    // Check cache first for GET requests
    if (method === 'GET' && useCache) {
      const cachedData = this.getFromCache(url);
      if (cachedData) {
        return cachedData;
      }
    }

    // Check data usage limit
    if (this.isDataUsageLimitReached()) {
      throw new Error('Daily data usage limit reached');
    }

    // Check if online
    if (!this.isOnline) {
      return this.handleOfflineRequest(url, { method, data, priority, culturalContext, timeout });
    }

    try {
      const compressedData = this.config.compressionEnabled ? this.compressData(data) : data;
      const response = await this.executeRequest(url, method, compressedData, timeout);
      
      // Update data usage
      this.updateDataUsage(this.estimateResponseSize(response));

      // Cache successful GET responses
      if (method === 'GET' && useCache) {
        this.addToCache(url, response, priority, culturalContext);
      }

      return response;
    } catch (error) {
      // Queue for retry if network error
      if (this.isNetworkError(error)) {
        return this.queueRequest(url, method, data, priority, culturalContext, timeout);
      }
      throw error;
    }
  }

  private async executeRequest(
    url: string,
    method: string,
    data?: any,
    timeout: number = this.config.baseTimeout
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept-Encoding': this.config.compressionEnabled ? 'gzip, deflate' : 'identity'
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private queueRequest(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any,
    priority: 'high' | 'medium' | 'low' = 'medium',
    culturalContext?: string,
    timeout: number = this.config.baseTimeout
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: `req_${Date.now()}_${Math.random()}`,
        url,
        method,
        data,
        priority,
        retryCount: 0,
        maxRetries: this.config.maxRetries,
        timeout,
        culturalContext,
        timestamp: Date.now()
      };

      this.requestQueue.push(request);
      this.sortQueueByPriority();

      // Store resolve/reject for later use
      (request as any).resolve = resolve;
      (request as any).reject = reject;

      // Start processing if not already running
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.isOnline) return;
    
    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0 && this.isOnline) {
      const request = this.requestQueue.shift()!;
      
      try {
        const response = await this.executeRequest(
          request.url,
          request.method,
          request.data,
          request.timeout
        );

        // Update data usage
        this.updateDataUsage(this.estimateResponseSize(response));

        // Resolve the promise
        (request as any).resolve(response);

        // Clear retry timer if exists
        const timerId = this.retryTimers.get(request.id);
        if (timerId) {
          clearTimeout(timerId);
          this.retryTimers.delete(request.id);
        }

      } catch (error) {
        request.retryCount++;

        if (request.retryCount <= request.maxRetries && this.isNetworkError(error)) {
          // Schedule retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, request.retryCount), 30000);
          
          const timerId = setTimeout(() => {
            this.requestQueue.unshift(request);
            this.retryTimers.delete(request.id);
          }, delay);

          this.retryTimers.set(request.id, timerId);
        } else {
          // Max retries reached or non-network error
          (request as any).reject(error);
        }
      }

      // Small delay between requests to avoid overwhelming the network
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessingQueue = false;
  }

  private sortQueueByPriority(): void {
    this.requestQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // If same priority, prioritize cultural content if enabled
      if (this.config.culturalContentPriority) {
        if (a.culturalContext && !b.culturalContext) return -1;
        if (!a.culturalContext && b.culturalContext) return 1;
      }
      
      // Finally, sort by timestamp (FIFO)
      return a.timestamp - b.timestamp;
    });
  }

  private handleOfflineRequest(
    url: string,
    options: {
      method: string;
      data?: any;
      priority?: string;
      culturalContext?: string;
      timeout?: number;
    }
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // Check cache for GET requests
      if (options.method === 'GET') {
        const cachedData = this.getFromCache(url);
        if (cachedData) {
          resolve(cachedData);
          return;
        }
      }

      // Queue the request for when connection is restored
      this.queueRequest(
        url,
        options.method as any,
        options.data,
        options.priority as any,
        options.culturalContext,
        options.timeout
      ).then(resolve).catch(reject);

      // Show offline notification for elderly users
      if (this.config.elderlyOptimizations) {
        Alert.alert(
          'Working Offline',
          'Your request will be processed when connection is restored.',
          [{ text: 'OK' }]
        );
      }
    });
  }

  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private addToCache(
    key: string,
    data: any,
    priority: 'high' | 'medium' | 'low' = 'medium',
    culturalContext?: string
  ): void {
    const size = this.estimateDataSize(data);
    const expiresAt = Date.now() + this.getCacheDuration(priority);
    
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt,
      size,
      priority,
      culturalContext
    };

    this.cache.set(key, entry);
    this.enforceMaxCacheSize();
    this.saveCache();
  }

  private getCacheDuration(priority: 'high' | 'medium' | 'low'): number {
    // Cache durations in milliseconds
    switch (priority) {
      case 'high': return 24 * 60 * 60 * 1000; // 24 hours
      case 'medium': return 12 * 60 * 60 * 1000; // 12 hours
      case 'low': return 6 * 60 * 60 * 1000; // 6 hours
      default: return 12 * 60 * 60 * 1000;
    }
  }

  private enforceMaxCacheSize(): void {
    const maxSizeBytes = this.config.maxCacheSize * 1024 * 1024;
    let currentSize = 0;
    
    // Calculate current cache size
    for (const entry of this.cache.values()) {
      currentSize += entry.size;
    }
    
    if (currentSize <= maxSizeBytes) return;
    
    // Sort by priority and age (remove low priority and old entries first)
    const entries = Array.from(this.cache.entries()).sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a[1].priority];
      const bPriority = priorityOrder[b[1].priority];
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority; // Lower priority first
      }
      
      return a[1].timestamp - b[1].timestamp; // Older first
    });
    
    // Remove entries until under limit
    for (const [key, entry] of entries) {
      if (currentSize <= maxSizeBytes) break;
      
      this.cache.delete(key);
      currentSize -= entry.size;
    }
  }

  private async saveCache(): Promise<void> {
    try {
      const cacheArray = Array.from(this.cache.entries());
      await AsyncStorage.setItem('network_cache', JSON.stringify(cacheArray));
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }

  private async loadCache(): Promise<void> {
    try {
      const cacheData = await AsyncStorage.getItem('network_cache');
      if (cacheData) {
        const cacheArray = JSON.parse(cacheData);
        this.cache = new Map(cacheArray);
        
        // Remove expired entries
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
          if (now > entry.expiresAt) {
            this.cache.delete(key);
          }
        }
      }
    } catch (error) {
      console.error('Error loading cache:', error);
    }
  }

  private async loadDataUsage(): Promise<void> {
    try {
      const today = new Date().toDateString();
      const storedUsage = await AsyncStorage.getItem(`data_usage_${today}`);
      this.dailyDataUsage = storedUsage ? parseInt(storedUsage) : 0;
      this.lastDataReset = today;
    } catch (error) {
      console.error('Error loading data usage:', error);
    }
  }

  private async updateDataUsage(bytes: number): Promise<void> {
    this.dailyDataUsage += bytes;
    this.metrics.dataUsage += bytes;
    
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem(`data_usage_${today}`, this.dailyDataUsage.toString());
    } catch (error) {
      console.error('Error saving data usage:', error);
    }
  }

  private checkDataUsageReset(): void {
    const today = new Date().toDateString();
    if (today !== this.lastDataReset) {
      this.dailyDataUsage = 0;
      this.lastDataReset = today;
    }
  }

  private isDataUsageLimitReached(): boolean {
    const limitBytes = this.config.dataUsageLimit * 1024 * 1024;
    return this.dailyDataUsage >= limitBytes;
  }

  private onConnectionRestored(): void {
    console.log('Connection restored, processing queued requests');
    
    if (this.config.elderlyOptimizations) {
      Alert.alert(
        'Connection Restored',
        'Your requests are now being processed.',
        [{ text: 'OK' }]
      );
    }
    
    // Start processing queue
    this.processQueue();
  }

  private onConnectionLost(): void {
    console.log('Connection lost, entering offline mode');
    
    if (this.config.elderlyOptimizations) {
      Alert.alert(
        'Connection Lost',
        'The app will continue working with saved information.',
        [{ text: 'OK' }]
      );
    }
  }

  private adjustOptimizationSettings(): void {
    if (this.config.adaptiveBandwidth) {
      // Adjust timeouts based on connection quality
      if (this.metrics.bandwidth < 1) { // Very slow connection
        this.config.baseTimeout = 30000; // 30 seconds
        this.config.compressionEnabled = true;
      } else if (this.metrics.bandwidth < 5) { // Slow connection
        this.config.baseTimeout = 20000; // 20 seconds
        this.config.compressionEnabled = true;
      } else { // Good connection
        this.config.baseTimeout = 10000; // 10 seconds
        this.config.compressionEnabled = false;
      }
    }
  }

  private estimateBandwidth(state: any): number {
    // Estimate bandwidth based on connection type
    switch (state.type) {
      case 'wifi': return 50; // Assume 50 Mbps for WiFi
      case 'cellular':
        const details = state.details as any;
        switch (details?.cellularGeneration) {
          case '5g': return 100;
          case '4g': return 20;
          case '3g': return 5;
          case '2g': return 0.5;
          default: return 10;
        }
      case 'ethernet': return 100;
      default: return 1;
    }
  }

  private estimateLatency(state: any): number {
    // Estimate latency based on connection type
    switch (state.type) {
      case 'wifi': return 20;
      case 'cellular': return 100;
      case 'ethernet': return 10;
      default: return 200;
    }
  }

  private calculateReliability(state: any): number {
    // Calculate reliability based on connection stability
    if (!state.isConnected) return 0;
    
    switch (state.type) {
      case 'wifi': return 95;
      case 'ethernet': return 99;
      case 'cellular': return 85;
      default: return 70;
    }
  }

  private compressData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    // Simple compression: remove null/undefined values and trim strings
    const compressed: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        if (typeof value === 'string') {
          compressed[key] = value.trim();
        } else if (typeof value === 'object') {
          compressed[key] = this.compressData(value);
        } else {
          compressed[key] = value;
        }
      }
    }
    
    return compressed;
  }

  private estimateDataSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  private estimateResponseSize(response: any): number {
    return this.estimateDataSize(response);
  }

  private isNetworkError(error: any): boolean {
    return error.name === 'TypeError' || 
           error.name === 'NetworkError' || 
           error.message.includes('fetch') ||
           error.message.includes('network') ||
           error.message.includes('timeout');
  }

  getNetworkMetrics(): NetworkMetrics {
    return { ...this.metrics };
  }

  getQueueStatus(): {
    queueLength: number;
    isProcessing: boolean;
    pendingRequests: number;
    dataUsageToday: number;
    dataUsageLimit: number;
  } {
    return {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessingQueue,
      pendingRequests: this.retryTimers.size,
      dataUsageToday: this.dailyDataUsage,
      dataUsageLimit: this.config.dataUsageLimit * 1024 * 1024
    };
  }

  getCacheStatus(): {
    entries: number;
    totalSize: number;
    maxSize: number;
    hitRate: number;
  } {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }

    return {
      entries: this.cache.size,
      totalSize,
      maxSize: this.config.maxCacheSize * 1024 * 1024,
      hitRate: 0 // TODO: Implement hit rate tracking
    };
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
    await AsyncStorage.removeItem('network_cache');
  }

  async clearQueue(): Promise<void> {
    // Reject all pending requests
    for (const request of this.requestQueue) {
      (request as any).reject(new Error('Queue cleared'));
    }
    
    // Clear timers
    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer);
    }
    
    this.requestQueue = [];
    this.retryTimers.clear();
  }

  updateConfig(newConfig: Partial<NetworkOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  setOfflineMode(enabled: boolean): void {
    this.config.offlineMode = enabled;
    if (enabled) {
      this.isOnline = false;
    }
  }
}

export default new NetworkOptimizer();