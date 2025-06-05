import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

interface ConversationChunk {
  id: string;
  messages: Array<{ id: string; content: string; speaker: string; timestamp: number; text?: string; sender?: string; culturalTone?: string }>;
  startTime: number;
  endTime: number;
  culturalContext: string;
  memorySize: number;
}

interface MemoryMetrics {
  totalMemoryUsage: number;
  activeChunks: number;
  cachedChunks: number;
  lastCleanup: number;
  avgChunkSize: number;
  performanceScore: number;
}

interface MemoryOptimizationConfig {
  maxActiveChunks: number;
  maxCachedChunks: number;
  chunkSizeLimit: number; // in MB
  cleanupInterval: number; // in milliseconds
  compressionEnabled: boolean;
  elderlyOptimizations: boolean;
  autoArchiveAfterHours: number;
}

class MemoryOptimizer {
  private config: MemoryOptimizationConfig;
  private activeChunks: Map<string, ConversationChunk> = new Map();
  private cachedChunks: Map<string, ConversationChunk> = new Map();
  private metrics: MemoryMetrics;
  private cleanupTimer?: NodeJS.Timeout;
  private memoryWarningThreshold = 0.8; // 80% of available memory

  constructor() {
    this.config = {
      maxActiveChunks: 3, // Keep fewer active chunks for elderly users
      maxCachedChunks: 10,
      chunkSizeLimit: 5, // 5MB per chunk
      cleanupInterval: 300000, // 5 minutes
      compressionEnabled: true,
      elderlyOptimizations: true,
      autoArchiveAfterHours: 24
    };

    this.metrics = {
      totalMemoryUsage: 0,
      activeChunks: 0,
      cachedChunks: 0,
      lastCleanup: Date.now(),
      avgChunkSize: 0,
      performanceScore: 100
    };

    this.initializeMemoryMonitoring();
    this.loadStoredChunks();
  }

  async addConversationMessage(
    conversationId: string,
    message: { id: string; content: string; speaker: string; timestamp: number; text?: string; sender?: string; culturalTone?: string },
    culturalContext: string
  ): Promise<void> {
    try {
      let chunk = this.activeChunks.get(conversationId);
      
      if (!chunk) {
        chunk = this.createNewChunk(conversationId, culturalContext);
        this.activeChunks.set(conversationId, chunk);
      }

      // Add message to chunk
      chunk.messages.push({
        ...message,
        timestamp: Date.now(),
        memorySize: this.estimateMessageSize(message)
      });

      chunk.endTime = Date.now();
      chunk.memorySize += this.estimateMessageSize(message);

      // Check if chunk needs to be split
      if (this.shouldSplitChunk(chunk)) {
        await this.splitChunk(conversationId, chunk);
      }

      // Update metrics
      this.updateMetrics();

      // Check memory pressure
      if (this.isMemoryPressureHigh()) {
        await this.performEmergencyCleanup();
      }

    } catch (error) {
      console.error('Error adding conversation message:', error);
      throw error;
    }
  }

  async getConversationHistory(
    conversationId: string,
    limit?: number
  ): Promise<Array<{ id: string; content: string; speaker: string; timestamp: number; text?: string; sender?: string; culturalTone?: string }>> {
    try {
      const messages: Array<{ id: string; content: string; speaker: string; timestamp: number; text?: string; sender?: string; culturalTone?: string }> = [];
      
      // Get from active chunks first
      const activeChunk = this.activeChunks.get(conversationId);
      if (activeChunk) {
        messages.push(...activeChunk.messages);
      }

      // Get from cached chunks if needed
      const cachedChunk = this.cachedChunks.get(conversationId);
      if (cachedChunk && (!limit || messages.length < limit)) {
        messages.unshift(...cachedChunk.messages);
      }

      // Get from storage if still need more
      if (!limit || messages.length < limit) {
        const storedMessages = await this.loadMessagesFromStorage(conversationId);
        messages.unshift(...storedMessages);
      }

      // Apply limit and sort
      const sortedMessages = messages
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      return limit ? sortedMessages.slice(-limit) : sortedMessages;
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  private createNewChunk(conversationId: string, culturalContext: string): ConversationChunk {
    return {
      id: `${conversationId}_${Date.now()}`,
      messages: [],
      startTime: Date.now(),
      endTime: Date.now(),
      culturalContext,
      memorySize: 0,
      isActive: true
    };
  }

  private shouldSplitChunk(chunk: ConversationChunk): boolean {
    const sizeLimit = this.config.chunkSizeLimit * 1024 * 1024; // Convert MB to bytes
    const messageLimit = this.config.elderlyOptimizations ? 50 : 100; // Fewer messages for elderly
    
    return chunk.memorySize > sizeLimit || 
           chunk.messages.length > messageLimit ||
           (Date.now() - chunk.startTime) > (this.config.autoArchiveAfterHours * 3600000);
  }

  private async splitChunk(conversationId: string, chunk: ConversationChunk): Promise<void> {
    try {
      // Mark current chunk as inactive
      chunk.isActive = false;

      // Move to cached chunks
      this.cachedChunks.set(chunk.id, chunk);
      
      // Remove from active chunks
      this.activeChunks.delete(conversationId);

      // Archive to storage if cache is full
      if (this.cachedChunks.size > this.config.maxCachedChunks) {
        await this.archiveOldestCachedChunk();
      }

      // Create new active chunk
      const newChunk = this.createNewChunk(conversationId, chunk.culturalContext);
      this.activeChunks.set(conversationId, newChunk);

    } catch (error) {
      console.error('Error splitting chunk:', error);
    }
  }

  private async archiveOldestCachedChunk(): Promise<void> {
    try {
      let oldestChunk: ConversationChunk | null = null;
      let oldestKey = '';

      for (const [_key, chunk] of this.cachedChunks.entries()) {
        if (!oldestChunk || chunk.startTime < oldestChunk.startTime) {
          oldestChunk = chunk;
          oldestKey = _key;
        }
      }

      if (oldestChunk && oldestKey) {
        // Compress if enabled
        const chunkData = this.config.compressionEnabled 
          ? this.compressChunk(oldestChunk)
          : oldestChunk;

        // Store to AsyncStorage
        await AsyncStorage.setItem(
          `archived_chunk_${oldestKey}`,
          JSON.stringify(chunkData)
        );

        // Remove from cache
        this.cachedChunks.delete(oldestKey);
      }
    } catch (error) {
      console.error('Error archiving chunk:', error);
    }
  }

  private compressChunk(chunk: ConversationChunk): {
    id: string;
    messages: Array<{ id: string; text: string; sender: string; timestamp: number; culturalTone?: string }>;
    startTime: number;
    endTime: number;
    culturalContext: string;
    memorySize: number;
  } {
    // Simple compression: remove redundant data and optimize message structure
    const compressedMessages = chunk.messages.map(msg => ({
      id: msg.id,
      text: msg.text,
      sender: msg.sender,
      timestamp: msg.timestamp,
      culturalTone: msg.culturalTone
    }));

    return {
      ...chunk,
      messages: compressedMessages,
      compressed: true
    };
  }

  private async loadFromStorage(conversationId: string): Promise<Array<{ id: string; content: string; speaker: string; timestamp: number; text?: string; sender?: string; culturalTone?: string }>> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const chunkKeys = keys.filter(key => 
        key.startsWith('archived_chunk_') && key.includes(conversationId)
      );

      const messages: Array<{ id: string; content: string; speaker: string; timestamp: number; text?: string; sender?: string; culturalTone?: string }> = [];

      for (const key of chunkKeys) {
        const chunkData = await AsyncStorage.getItem(key);
        if (chunkData) {
          const chunk = JSON.parse(chunkData);
          messages.push(...chunk.messages);
        }
      }

      return messages;
    } catch (error) {
      console.error('Error loading messages from storage:', error);
      return [];
    }
  }

  private estimateMessageSize(message: { content?: string; text?: string; [key: string]: unknown }): number {
    // Estimate memory size in bytes
    const jsonString = JSON.stringify(message);
    return new Blob([jsonString]).size;
  }

  private initializeMemoryMonitoring(): void {
    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.performRoutineCleanup();
    }, this.config.cleanupInterval);

    // Monitor memory usage periodically
    setInterval(() => {
      this.updateMetrics();
      this.checkMemoryHealth();
    }, 60000); // Every minute
  }

  public async performRoutineCleanup(): Promise<void> {
    try {
      // Remove old inactive chunks from cache
      const now = Date.now();
      const maxAge = this.config.autoArchiveAfterHours * 3600000;

      for (const [_key, chunk] of this.cachedChunks.entries()) {
        if (now - chunk.endTime > maxAge) {
          await this.archiveOldestCachedChunk();
        }
      }

      // Update cleanup timestamp
      this.metrics.lastCleanup = now;

    } catch (error) {
      console.error('Error during routine cleanup:', error);
    }
  }

  public async performEmergencyCleanup(): Promise<void> {
    try {
      console.warn('Performing emergency memory cleanup');

      // Archive half of cached chunks
      const chunksToArchive = Math.ceil(this.cachedChunks.size / 2);
      
      for (let i = 0; i < chunksToArchive; i++) {
        await this.archiveOldestCachedChunk();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Show warning to user if on elderly optimization mode
      if (this.config.elderlyOptimizations) {
        Alert.alert(
          'Memory Optimized',
          'The app has been optimized for better performance.',
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error('Error during emergency cleanup:', error);
    }
  }

  private isMemoryPressureHigh(): boolean {
    return this.metrics.performanceScore < 70 || 
           this.activeChunks.size > this.config.maxActiveChunks ||
           this.cachedChunks.size > this.config.maxCachedChunks;
  }

  private updateMetrics(): void {
    let totalMemory = 0;
    let totalMessages = 0;

    // Calculate active chunks metrics
    for (const chunk of this.activeChunks.values()) {
      totalMemory += chunk.memorySize;
      totalMessages += chunk.messages.length;
    }

    // Calculate cached chunks metrics
    for (const chunk of this.cachedChunks.values()) {
      totalMemory += chunk.memorySize;
      totalMessages += chunk.messages.length;
    }

    this.metrics = {
      totalMemoryUsage: totalMemory,
      activeChunks: this.activeChunks.size,
      cachedChunks: this.cachedChunks.size,
      lastCleanup: this.metrics.lastCleanup,
      avgChunkSize: totalMessages > 0 ? totalMemory / (this.activeChunks.size + this.cachedChunks.size) : 0,
      performanceScore: this.calculatePerformanceScore()
    };
  }

  private calculatePerformanceScore(): number {
    let score = 100;

    // Deduct points for high memory usage
    const memoryUsageMB = this.metrics.totalMemoryUsage / (1024 * 1024);
    if (memoryUsageMB > 50) score -= 20;
    if (memoryUsageMB > 100) score -= 30;

    // Deduct points for too many chunks
    if (this.activeChunks.size > this.config.maxActiveChunks) score -= 15;
    if (this.cachedChunks.size > this.config.maxCachedChunks) score -= 10;

    // Deduct points for old cleanup
    const timeSinceCleanup = Date.now() - this.metrics.lastCleanup;
    if (timeSinceCleanup > this.config.cleanupInterval * 2) score -= 10;

    return Math.max(0, score);
  }

  private checkMemoryHealth(): void {
    if (this.metrics.performanceScore < 50) {
      console.warn('Memory health is poor, consider cleanup');
      this.performRoutineCleanup();
    }
  }

  private async loadStoredChunks(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const chunkKeys = keys.filter(key => key.startsWith('archived_chunk_'));
      
      // Load recent chunks into cache if space available
      const recentChunks = chunkKeys.slice(-this.config.maxCachedChunks);
      
      for (const key of recentChunks) {
        if (this.cachedChunks.size < this.config.maxCachedChunks) {
          const chunkData = await AsyncStorage.getItem(key);
          if (chunkData) {
            const chunk = JSON.parse(chunkData);
            this.cachedChunks.set(chunk.id, chunk);
          }
        }
      }
    } catch (error) {
      console.error('Error loading stored chunks:', error);
    }
  }

  getMemoryMetrics(): MemoryMetrics {
    return { ...this.metrics };
  }

  getMemoryReport(): {
    metrics: MemoryMetrics;
    recommendations: string[];
    healthStatus: 'excellent' | 'good' | 'warning' | 'critical';
  } {
    const recommendations: string[] = [];
    let healthStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';

    if (this.metrics.performanceScore < 30) {
      healthStatus = 'critical';
      recommendations.push('Immediate cleanup required');
      recommendations.push('Consider restarting the app');
    } else if (this.metrics.performanceScore < 50) {
      healthStatus = 'warning';
      recommendations.push('Memory cleanup recommended');
      recommendations.push('Archive old conversations');
    } else if (this.metrics.performanceScore < 80) {
      healthStatus = 'good';
      recommendations.push('Performance is good');
    }

    if (this.metrics.totalMemoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push('High memory usage detected');
    }

    return {
      metrics: this.metrics,
      recommendations,
      healthStatus
    };
  }

  async clearAllData(): Promise<void> {
    try {
      // Clear in-memory data
      this.activeChunks.clear();
      this.cachedChunks.clear();

      // Clear stored data
      const keys = await AsyncStorage.getAllKeys();
      const chunkKeys = keys.filter(key => key.startsWith('archived_chunk_'));
      await AsyncStorage.multiRemove(chunkKeys);

      // Reset metrics
      this.metrics = {
        totalMemoryUsage: 0,
        activeChunks: 0,
        cachedChunks: 0,
        lastCleanup: Date.now(),
        avgChunkSize: 0,
        performanceScore: 100
      };

    } catch (error) {
      console.error('Error clearing memory data:', error);
    }
  }

  updateConfig(newConfig: Partial<MemoryOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

export default new MemoryOptimizer();