import { ConversionTask, BatchConversionTask, ConversionStatus, ErrorType, ConversionError, ConversionHistory } from './types';
import { svgTemplateService } from './svg-template';
import { storageService } from './storage';

/**
 * 转换进度回调函数类型
 */
export type ProgressCallback = (task: ConversionTask) => void;
export type BatchProgressCallback = (batch: BatchConversionTask) => void;

/**
 * 图片转换服务类
 */
export class ConversionService {
    private workers: Worker[] = [];
    private maxWorkers = navigator.hardwareConcurrency || 4;

    /**
     * 生成唯一ID
     */
    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 创建单个转换任务
     */
    createTask(file: File): ConversionTask {
        // 验证文件类型
        if (!svgTemplateService.validateImageFile(file)) {
            throw new ConversionError({
                type: ErrorType.FILE_READ_ERROR,
                message: `不支持的文件格式: ${file.type}`
            });
        }

        return {
            id: this.generateId(),
            file,
            fileName: svgTemplateService.getFileNameWithoutExtension(file.name),
            fileSize: file.size,
            status: ConversionStatus.PENDING,
            progress: 0,
            createdAt: new Date()
        };
    }

    /**
     * 创建批量转换任务
     */
    createBatchTask(files: File[]): BatchConversionTask {
        const tasks = files.map(file => this.createTask(file));

        return {
            batchId: this.generateId(),
            tasks,
            totalProgress: 0,
            status: ConversionStatus.PENDING,
            createdAt: new Date()
        };
    }

    /**
     * 转换单个任务
     */
    async convertSingleTask(task: ConversionTask, onProgress?: ProgressCallback): Promise<ConversionTask> {
        try {
            // 更新状态为处理中
            task.status = ConversionStatus.PROCESSING;
            task.progress = 0;
            onProgress?.(task);

            // 模拟进度更新
            const updateProgress = (progress: number) => {
                task.progress = Math.min(progress, 100);
                onProgress?.(task);
            };

            updateProgress(20);

            // 执行转换
            const svgContent = await svgTemplateService.convertFileToSvg(task.file);

            updateProgress(80);

            // 更新任务状态
            task.svgContent = svgContent;
            task.status = ConversionStatus.COMPLETED;
            task.progress = 100;
            task.completedAt = new Date();

            updateProgress(100);
            onProgress?.(task);

            return task;
        } catch (error) {
            // 处理错误
            task.status = ConversionStatus.FAILED;
            task.error = error instanceof Error ? error.message : '转换失败';
            onProgress?.(task);
            throw error;
        }
    }

    /**
     * 批量转换任务
     */
    async convertBatchTask(
        batchTask: BatchConversionTask,
        onTaskProgress?: ProgressCallback,
        onBatchProgress?: BatchProgressCallback
    ): Promise<BatchConversionTask> {
        try {
            batchTask.status = ConversionStatus.PROCESSING;

            // 更新批次进度的函数
            const updateBatchProgress = () => {
                const completedTasks = batchTask.tasks.filter(
                    task => task.status === ConversionStatus.COMPLETED || task.status === ConversionStatus.FAILED
                ).length;

                batchTask.totalProgress = Math.round((completedTasks / batchTask.tasks.length) * 100);

                // 检查是否全部完成
                if (completedTasks === batchTask.tasks.length) {
                    const hasFailedTasks = batchTask.tasks.some(task => task.status === ConversionStatus.FAILED);

                    batchTask.status = hasFailedTasks ? ConversionStatus.FAILED : ConversionStatus.COMPLETED;
                    batchTask.completedAt = new Date();
                }

                onBatchProgress?.(batchTask);
            };

            // 并发处理任务，但控制并发数量
            const concurrencyLimit = Math.min(this.maxWorkers, batchTask.tasks.length);
            const processTask = async (task: ConversionTask) => {
                try {
                    await this.convertSingleTask(task, updatedTask => {
                        onTaskProgress?.(updatedTask);
                        updateBatchProgress();
                    });
                } catch (error) {
                    // 单个任务失败不影响其他任务
                    console.error(`任务 ${task.fileName} 转换失败:`, error);
                }
            };

            // 使用并发控制处理任务
            const processingTasks: Promise<void>[] = [];
            for (let i = 0; i < batchTask.tasks.length; i += concurrencyLimit) {
                const batch = batchTask.tasks.slice(i, i + concurrencyLimit);
                const batchPromises = batch.map(processTask);
                await Promise.all(batchPromises);
            }

            // 确保最终状态更新
            updateBatchProgress();

            return batchTask;
        } catch (error) {
            batchTask.status = ConversionStatus.FAILED;
            onBatchProgress?.(batchTask);
            throw error;
        }
    }

    /**
     * 保存批次任务到历史记录
     */
    async saveBatchToHistory(batchTask: BatchConversionTask): Promise<string> {
        try {
            const history: ConversionHistory = {
                id: this.generateId(),
                batch: batchTask,
                savedAt: new Date()
            };

            await storageService.saveHistory(history);
            return history.id;
        } catch (error) {
            console.error('保存历史记录失败:', error);
            throw error;
        }
    }

    /**
     * 获取转换统计信息
     */
    getBatchStatistics(batchTask: BatchConversionTask) {
        const total = batchTask.tasks.length;
        const completed = batchTask.tasks.filter(task => task.status === ConversionStatus.COMPLETED).length;
        const failed = batchTask.tasks.filter(task => task.status === ConversionStatus.FAILED).length;
        const processing = batchTask.tasks.filter(task => task.status === ConversionStatus.PROCESSING).length;
        const pending = batchTask.tasks.filter(task => task.status === ConversionStatus.PENDING).length;

        return {
            total,
            completed,
            failed,
            processing,
            pending,
            successRate: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }

    /**
     * 取消批次任务（标记为失败状态）
     */
    cancelBatchTask(batchTask: BatchConversionTask): void {
        batchTask.tasks.forEach(task => {
            if (task.status === ConversionStatus.PENDING || task.status === ConversionStatus.PROCESSING) {
                task.status = ConversionStatus.FAILED;
                task.error = '任务已取消';
            }
        });

        batchTask.status = ConversionStatus.FAILED;
    }
}

// 导出单例实例
export const conversionService = new ConversionService();

