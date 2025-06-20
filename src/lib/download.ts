import { ConversionTask, BatchConversionTask, ConversionStatus, DownloadOptions, ErrorType, ConversionError } from './types';
import { svgTemplateService } from './svg-template';

/**
 * 文件下载服务类
 */
export class DownloadService {
  /**
   * 下载单个文件
   */
  downloadFile(options: DownloadOptions): void {
    try {
      // 创建Blob对象
      const blob = new Blob([options.content], { type: options.mimeType });
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = url;
      link.download = options.fileName;
      link.style.display = 'none';
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      
      // 清理
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
         } catch (error) {
       const downloadError = new ConversionError({
         type: ErrorType.DOWNLOAD_ERROR,
         message: '文件下载失败',
         details: error
       });
       throw downloadError;
     }
  }

  /**
   * 下载单个转换任务的SVG文件
   */
  downloadTaskSvg(task: ConversionTask): void {
    if (task.status !== ConversionStatus.COMPLETED || !task.svgContent) {
      throw new ConversionError({
        type: ErrorType.DOWNLOAD_ERROR,
        message: '任务未完成或SVG内容不存在'
      });
    }

    const fileName = svgTemplateService.generateSvgFileName(task.file.name);
    
    this.downloadFile({
      fileName,
      content: task.svgContent,
      mimeType: 'image/svg+xml'
    });
  }

  /**
   * 批量下载转换任务的SVG文件（ZIP格式）
   */
  async downloadBatchSvg(batchTask: BatchConversionTask): Promise<void> {
    // 过滤出已完成的任务
    const completedTasks = batchTask.tasks.filter(
      task => task.status === ConversionStatus.COMPLETED && task.svgContent
    );

    if (completedTasks.length === 0) {
      throw new ConversionError({
        type: ErrorType.DOWNLOAD_ERROR,
        message: '没有已完成的转换任务可供下载'
      });
    }

    // 如果只有一个文件，直接下载
    if (completedTasks.length === 1) {
      this.downloadTaskSvg(completedTasks[0]);
      return;
    }

    // 多个文件时，使用浏览器原生方式依次下载
    // 注意：现代浏览器可能会阻止多个文件同时下载，需要用户确认
    const downloadPromises = completedTasks.map((task, index) => {
      return new Promise<void>((resolve) => {
        // 添加延迟避免浏览器下载限制
        setTimeout(() => {
          try {
            this.downloadTaskSvg(task);
            resolve();
          } catch (error) {
            console.error(`下载文件 ${task.fileName} 失败:`, error);
            resolve(); // 即使失败也继续
          }
        }, index * 200); // 每个文件延迟200ms
      });
    });

    await Promise.all(downloadPromises);
  }

  /**
   * 生成ZIP文件（如果需要真正的ZIP支持，需要添加JSZip库）
   */
  private async createZipFile(tasks: ConversionTask[]): Promise<Blob> {
    // 这里提供一个简单的实现概念
    // 实际项目中建议使用 JSZip 库来创建真正的ZIP文件
    
    // 简单的方案：将所有SVG内容合并到一个文本文件中
    let combinedContent = '';
    
    tasks.forEach((task, index) => {
      if (task.svgContent) {
        const fileName = svgTemplateService.generateSvgFileName(task.file.name);
        combinedContent += `\n<!-- File: ${fileName} -->\n`;
        combinedContent += task.svgContent;
        combinedContent += '\n\n';
      }
    });

    return new Blob([combinedContent], { type: 'text/plain' });
  }

  /**
   * 下载所有SVG文件为合并的文本文件
   */
  async downloadBatchAsText(batchTask: BatchConversionTask): Promise<void> {
    const completedTasks = batchTask.tasks.filter(
      task => task.status === ConversionStatus.COMPLETED && task.svgContent
    );

    if (completedTasks.length === 0) {
      throw new ConversionError({
        type: ErrorType.DOWNLOAD_ERROR,
        message: '没有已完成的转换任务可供下载'
      });
    }

    const zipBlob = await this.createZipFile(completedTasks);
    const url = window.URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = `svg-batch-${new Date().toISOString().split('T')[0]}.txt`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * 预览SVG内容（在新窗口中打开）
   */
  previewSvg(task: ConversionTask): void {
    if (task.status !== ConversionStatus.COMPLETED || !task.svgContent) {
      throw new ConversionError({
        type: ErrorType.DOWNLOAD_ERROR,
        message: '任务未完成或SVG内容不存在'
      });
    }

    const blob = new Blob([task.svgContent], { type: 'image/svg+xml' });
    const url = window.URL.createObjectURL(blob);
    
    const newWindow = window.open(url, '_blank');
    
    // 清理URL（延迟执行以确保窗口已加载）
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);

         if (!newWindow) {
       throw new ConversionError({
         type: ErrorType.DOWNLOAD_ERROR,
         message: '无法打开预览窗口，可能被浏览器阻止'
       });
     }
  }

  /**
   * 获取下载统计信息
   */
  getBatchDownloadInfo(batchTask: BatchConversionTask) {
    const completedTasks = batchTask.tasks.filter(
      task => task.status === ConversionStatus.COMPLETED && task.svgContent
    );

    const totalSize = completedTasks.reduce((sum, task) => {
      return sum + (task.svgContent?.length || 0);
    }, 0);

    return {
      availableFiles: completedTasks.length,
      totalFiles: batchTask.tasks.length,
      estimatedSize: totalSize,
      canDownload: completedTasks.length > 0
    };
  }
}

// 导出单例实例
export const downloadService = new DownloadService(); 
