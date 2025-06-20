'use client';

import React, { useState, useCallback } from 'react';
import { Play, RotateCcw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUpload } from '@/components/file-upload';
import { ConversionProgress } from '@/components/conversion-progress';
import { HistoryPanel } from '@/components/history-panel';
import { BatchConversionTask, ConversionTask, ConversionStatus, ConversionHistory } from '@/lib/types';
import { conversionService } from '@/lib/conversion';
import { downloadService } from '@/lib/download';

/**
 * 主页面组件
 */
export default function Home() {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [currentBatch, setCurrentBatch] = useState<BatchConversionTask | null>(null);
    const [isConverting, setIsConverting] = useState(false);
    const [error, setError] = useState<string>('');

    // 处理文件选择
    const handleFilesSelected = useCallback(
        (files: File[]) => {
            setSelectedFiles(files);
            setError('');
            // 如果有进行中的转换，清除它
            if (currentBatch && currentBatch.status === ConversionStatus.PROCESSING) {
                conversionService.cancelBatchTask(currentBatch);
            }
            setCurrentBatch(null);
        },
        [currentBatch]
    );

    // 开始转换
    const handleStartConversion = useCallback(async () => {
        if (selectedFiles.length === 0) {
            setError('请先选择要转换的图片文件');
            return;
        }

        try {
            setIsConverting(true);
            setError('');

            // 创建批次任务
            const batchTask = conversionService.createBatchTask(selectedFiles);
            setCurrentBatch(batchTask);

            // 开始转换
            await conversionService.convertBatchTask(
                batchTask,
                // 单个任务进度回调
                (task: ConversionTask) => {
                    setCurrentBatch(prevBatch => {
                        if (!prevBatch) return null;
                        return {
                            ...prevBatch,
                            tasks: prevBatch.tasks.map(t => (t.id === task.id ? task : t))
                        };
                    });
                },
                // 批次进度回调
                (batch: BatchConversionTask) => {
                    setCurrentBatch(batch);
                }
            );

            // 转换完成后保存到历史记录
            if (batchTask.status === ConversionStatus.COMPLETED || batchTask.tasks.some(t => t.status === ConversionStatus.COMPLETED)) {
                try {
                    await conversionService.saveBatchToHistory(batchTask);
                } catch (saveError) {
                    console.warn('保存历史记录失败:', saveError);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '转换过程中发生错误');
        } finally {
            setIsConverting(false);
        }
    }, [selectedFiles]);

    // 重新开始
    const handleRestart = useCallback(() => {
        setSelectedFiles([]);
        setCurrentBatch(null);
        setError('');
        setIsConverting(false);
    }, []);

    // 取消转换
    const handleCancelConversion = useCallback((batchTask: BatchConversionTask) => {
        if (batchTask.status === ConversionStatus.PROCESSING) {
            conversionService.cancelBatchTask(batchTask);
            setIsConverting(false);
        }
    }, []);

    // 批量下载
    const handleDownloadAll = useCallback(async (batchTask: BatchConversionTask) => {
        try {
            await downloadService.downloadBatchSvg(batchTask);
        } catch (err) {
            setError(err instanceof Error ? err.message : '下载失败');
        }
    }, []);

    // 单个文件下载
    const handleDownloadSingle = useCallback((task: ConversionTask) => {
        try {
            downloadService.downloadTaskSvg(task);
        } catch (err) {
            setError(err instanceof Error ? err.message : '下载失败');
        }
    }, []);

    // 预览文件
    const handlePreview = useCallback((task: ConversionTask) => {
        // 转换进度组件现在有自己的弹窗预览，这里不需要额外处理
        console.log('预览任务:', task);
    }, []);

    // 选择历史记录
    const handleHistorySelect = useCallback((history: ConversionHistory) => {
        // 可以实现选择历史记录后的操作，比如重新显示该批次
        console.log('选择了历史记录:', history);
    }, []);

    return (
        <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
            <div className='container mx-auto px-4 py-8'>
                {/* 头部 */}
                <div className='text-center mb-8'>
                    <div className='flex items-center justify-center mb-4'>
                        <div className='p-3 bg-blue-600 rounded-full mr-4'>
                            <Zap className='w-8 h-8 text-white' />
                        </div>
                        <h1 className='text-4xl font-bold text-gray-900'>图片转 SVG 工具</h1>
                    </div>
                    <p className='text-lg text-gray-600 max-w-2xl mx-auto'>
                        快速将您的图片转换为 SVG 格式，支持批量处理，提供完整的转换历史记录管理
                    </p>
                </div>

                {/* 操作区域 */}
                <div className='max-w-4xl mx-auto space-y-6'>
                    {/* 控制面板 */}
                    <Card>
                        <CardHeader>
                            <div className='flex items-center justify-between'>
                                <CardTitle className='text-xl'>转换控制台</CardTitle>
                                <div className='flex items-center space-x-2'>
                                    <HistoryPanel onHistorySelect={handleHistorySelect} />
                                    {(selectedFiles.length > 0 || currentBatch) && (
                                        <Button variant='outline' size='sm' onClick={handleRestart} disabled={isConverting}>
                                            <RotateCcw className='w-4 h-4 mr-2' />
                                            重新开始
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className='space-y-6'>
                            {/* 文件上传 */}
                            {!currentBatch && (
                                <div className='space-y-4'>
                                    <FileUpload onFilesSelected={handleFilesSelected} disabled={isConverting} />

                                    {selectedFiles.length > 0 && (
                                        <div className='flex justify-center'>
                                            <Button onClick={handleStartConversion} disabled={isConverting} size='lg' className='px-8'>
                                                <Play className='w-5 h-5 mr-2' />
                                                开始转换 ({selectedFiles.length} 个文件)
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 错误提示 */}
                            {error && (
                                <Alert variant='destructive'>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {/* 转换进度 */}
                            {currentBatch && (
                                <ConversionProgress
                                    batchTask={currentBatch}
                                    onDownloadSingle={handleDownloadSingle}
                                    onDownloadAll={handleDownloadAll}
                                    onPreview={handlePreview}
                                    onCancel={handleCancelConversion}
                                />
                            )}
                        </CardContent>
                    </Card>

                    {/* 功能说明 */}
                    {!currentBatch && selectedFiles.length === 0 && (
                        <div className='grid md:grid-cols-3 gap-6'>
                            <Card className='text-center'>
                                <CardContent className='p-6'>
                                    <div className='w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                                        <span className='text-2xl'>📸</span>
                                    </div>
                                    <h3 className='text-lg font-semibold mb-2'>支持多格式</h3>
                                    <p className='text-gray-600 text-sm'>支持 JPG、PNG、GIF、WebP、BMP 等主流图片格式，单文件最大 10MB</p>
                                </CardContent>
                            </Card>

                            <Card className='text-center'>
                                <CardContent className='p-6'>
                                    <div className='w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                                        <span className='text-2xl'>⚡</span>
                                    </div>
                                    <h3 className='text-lg font-semibold mb-2'>批量处理</h3>
                                    <p className='text-gray-600 text-sm'>一次性处理多个文件，智能并发控制，提供实时转换进度反馈</p>
                                </CardContent>
                            </Card>

                            <Card className='text-center'>
                                <CardContent className='p-6'>
                                    <div className='w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                                        <span className='text-2xl'>💾</span>
                                    </div>
                                    <h3 className='text-lg font-semibold mb-2'>历史记录</h3>
                                    <p className='text-gray-600 text-sm'>自动保存转换历史，支持快速下载和预览，便于文件管理</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>

                {/* 页脚 */}
                <footer className='text-center mt-16 py-8 text-gray-500'>
                    <p className='text-sm'>基于 Next.js + TypeScript 构建，部署在 Cloudflare Pages</p>
                </footer>
            </div>
        </div>
    );
}

