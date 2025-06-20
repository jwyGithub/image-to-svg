import { ConversionHistory, StorageItem, ErrorType, ConversionError } from './types';

/**
 * IndexDB存储服务类
 */
export class StorageService {
  private dbName = 'image-to-svg-db';
  private version = 1;
  private storeName = 'conversion-history';
  private db: IDBDatabase | null = null;

  /**
   * 初始化数据库连接
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        const error = new ConversionError({
          type: ErrorType.STORAGE_ERROR,
          message: '无法打开IndexDB数据库',
          details: request.error
        });
        reject(error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建对象存储
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * 保存转换历史记录
   */
  async saveHistory(history: ConversionHistory): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);

      const storageItem: StorageItem = {
        id: history.id,
        data: history,
        timestamp: Date.now()
      };

      const request = objectStore.put(storageItem);

      request.onerror = () => {
        const error = new ConversionError({
          type: ErrorType.STORAGE_ERROR,
          message: '保存历史记录失败',
          details: request.error
        });
        reject(error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * 获取所有历史记录
   */
  async getAllHistory(): Promise<ConversionHistory[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const index = objectStore.index('timestamp');

      // 按时间戳降序排列
      const request = index.openCursor(null, 'prev');
      const results: ConversionHistory[] = [];

      request.onerror = () => {
        const error = new ConversionError({
          type: ErrorType.STORAGE_ERROR,
          message: '获取历史记录失败',
          details: request.error
        });
        reject(error);
      };

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          results.push(cursor.value.data);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
    });
  }

  /**
   * 根据ID获取历史记录
   */
  async getHistoryById(id: string): Promise<ConversionHistory | null> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.get(id);

      request.onerror = () => {
        const error = new ConversionError({
          type: ErrorType.STORAGE_ERROR,
          message: '获取指定历史记录失败',
          details: request.error
        });
        reject(error);
      };

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
    });
  }

  /**
   * 删除指定历史记录
   */
  async deleteHistory(id: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.delete(id);

      request.onerror = () => {
        const error = new ConversionError({
          type: ErrorType.STORAGE_ERROR,
          message: '删除历史记录失败',
          details: request.error
        });
        reject(error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * 清空所有历史记录
   */
  async clearAllHistory(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.clear();

      request.onerror = () => {
        const error = new ConversionError({
          type: ErrorType.STORAGE_ERROR,
          message: '清空历史记录失败',
          details: request.error
        });
        reject(error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * 获取存储使用情况
   */
  async getStorageInfo(): Promise<{ count: number; estimatedSize: number }> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const countRequest = objectStore.count();

      countRequest.onerror = () => {
        const error = new ConversionError({
          type: ErrorType.STORAGE_ERROR,
          message: '获取存储信息失败',
          details: countRequest.error
        });
        reject(error);
      };

      countRequest.onsuccess = () => {
        const count = countRequest.result;
        // 估算存储大小（简单估算）
        const estimatedSize = count * 50 * 1024; // 假设每条记录平均50KB
        resolve({ count, estimatedSize });
      };
    });
  }
}

// 导出单例实例
export const storageService = new StorageService(); 
