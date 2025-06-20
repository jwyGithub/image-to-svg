/**
 * 图片转换任务的状态枚举
 */
export enum ConversionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * 单个图片转换任务接口
 */
export interface ConversionTask {
  /** 任务唯一标识 */
  id: string;
  /** 原始文件 */
  file: File;
  /** 原始文件名（不含扩展名） */
  fileName: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** 转换状态 */
  status: ConversionStatus;
  /** 进度百分比 (0-100) */
  progress: number;
  /** 转换后的SVG内容 */
  svgContent?: string;
  /** 错误信息 */
  error?: string;
  /** 创建时间 */
  createdAt: Date;
  /** 完成时间 */
  completedAt?: Date;
}

/**
 * 批量转换任务接口
 */
export interface BatchConversionTask {
  /** 批次唯一标识 */
  batchId: string;
  /** 单个任务列表 */
  tasks: ConversionTask[];
  /** 批次总进度 */
  totalProgress: number;
  /** 批次状态 */
  status: ConversionStatus;
  /** 创建时间 */
  createdAt: Date;
  /** 完成时间 */
  completedAt?: Date;
}

/**
 * 历史记录接口
 */
export interface ConversionHistory {
  /** 历史记录ID */
  id: string;
  /** 批次任务 */
  batch: BatchConversionTask;
  /** 存储时间 */
  savedAt: Date;
}

/**
 * IndexDB存储的键值对接口
 */
export interface StorageItem {
  id: string;
  data: ConversionHistory;
  timestamp: number;
}

/**
 * 图片信息接口
 */
export interface ImageInfo {
  /** 图片宽度 */
  width: number;
  /** 图片高度 */
  height: number;
  /** Base64编码的图片数据 */
  base64: string;
}

/**
 * SVG模板参数接口
 */
export interface SvgTemplateParams {
  /** 图片宽度 */
  width: number;
  /** 图片高度 */
  height: number;
  /** Base64编码的图片数据 */
  base64: string;
}

/**
 * 文件下载选项接口
 */
export interface DownloadOptions {
  /** 下载的文件名 */
  fileName: string;
  /** 文件内容 */
  content: string;
  /** MIME类型 */
  mimeType: string;
}

/**
 * 错误类型枚举
 */
export enum ErrorType {
  FILE_READ_ERROR = 'file_read_error',
  IMAGE_LOAD_ERROR = 'image_load_error',
  CONVERSION_ERROR = 'conversion_error',
  STORAGE_ERROR = 'storage_error',
  DOWNLOAD_ERROR = 'download_error'
}

/**
 * 自定义错误类
 */
export class ConversionError extends Error {
  public type: ErrorType;
  public details?: any;

  constructor(config: { type: ErrorType; message: string; details?: any }) {
    super(config.message);
    this.type = config.type;
    this.details = config.details;
    this.name = 'ConversionError';
  }
} 
