'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, Loader2, Download, Eye, AlertCircle, ZoomIn, ZoomOut, RotateCw, X, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BatchConversionTask, ConversionTask, ConversionStatus } from '@/lib/types';
import { downloadService } from '@/lib/download';

interface ConversionProgressProps {
    batchTask: BatchConversionTask | null;
    onDownloadSingle?: (task: ConversionTask) => void;
    onDownloadAll?: (batchTask: BatchConversionTask) => void;
    onPreview?: (task: ConversionTask) => void;
    onCancel?: (batchTask: BatchConversionTask) => void;
}

/**
 * 转换进度组件
 */
export function ConversionProgress({ batchTask, onDownloadSingle, onDownloadAll, onPreview, onCancel }: ConversionProgressProps) {
    const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
    const [previewTask, setPreviewTask] = useState<ConversionTask | null>(null);
    const [previewScale, setPreviewScale] = useState(1);

    if (!batchTask) {
        return null;
    }

    // 获取状态图标
    const getStatusIcon = (status: ConversionStatus) => {
        switch (status) {
            case ConversionStatus.PENDING:
                return <Clock className='w-4 h-4 text-gray-500' />;
            case ConversionStatus.PROCESSING:
                return <Loader2 className='w-4 h-4 text-blue-500 animate-spin' />;
            case ConversionStatus.COMPLETED:
                return <CheckCircle className='w-4 h-4 text-green-500' />;
            case ConversionStatus.FAILED:
                return <XCircle className='w-4 h-4 text-red-500' />;
            default:
                return <Clock className='w-4 h-4 text-gray-500' />;
        }
    };

    // 获取状态颜色
    const getStatusColor = (status: ConversionStatus) => {
        switch (status) {
            case ConversionStatus.PENDING:
                return 'secondary';
            case ConversionStatus.PROCESSING:
                return 'default';
            case ConversionStatus.COMPLETED:
                return 'default';
            case ConversionStatus.FAILED:
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    // 获取状态文本
    const getStatusText = (status: ConversionStatus) => {
        switch (status) {
            case ConversionStatus.PENDING:
                return '等待中';
            case ConversionStatus.PROCESSING:
                return '转换中';
            case ConversionStatus.COMPLETED:
                return '已完成';
            case ConversionStatus.FAILED:
                return '转换失败';
            default:
                return '未知';
        }
    };

    // 计算统计信息
    const stats = {
        total: batchTask.tasks.length,
        completed: batchTask.tasks.filter(t => t.status === ConversionStatus.COMPLETED).length,
        processing: batchTask.tasks.filter(t => t.status === ConversionStatus.PROCESSING).length,
        failed: batchTask.tasks.filter(t => t.status === ConversionStatus.FAILED).length,
        pending: batchTask.tasks.filter(t => t.status === ConversionStatus.PENDING).length
    };

    // 处理单个文件下载（只调用回调函数，避免重复下载）
    const handleSingleDownload = (task: ConversionTask) => {
        onDownloadSingle?.(task);
    };

    // 处理预览
    const handlePreview = (task: ConversionTask) => {
        if (task.status !== ConversionStatus.COMPLETED || !task.svgContent) {
            console.error('任务未完成或SVG内容不存在');
            return;
        }
        setPreviewTask(task);
        setPreviewScale(1);
        setPreviewDialogOpen(true);
        onPreview?.(task);
    };

    // 关闭预览
    const handleClosePreview = () => {
        setPreviewDialogOpen(false);
        setPreviewTask(null);
        setPreviewScale(1);
    };

    // 缩放控制
    const handleZoomIn = () => {
        setPreviewScale(prev => Math.min(prev + 0.2, 3));
    };

    const handleZoomOut = () => {
        setPreviewScale(prev => Math.max(prev - 0.2, 0.2));
    };

    const handleResetZoom = () => {
        setPreviewScale(1);
    };

    // 格式化文件大小
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // 计算总耗时
    const getTotalDuration = (): string => {
        if (!batchTask.completedAt) return '';
        const duration = batchTask.completedAt.getTime() - batchTask.createdAt.getTime();
        const seconds = Math.floor(duration / 1000);
        if (seconds < 60) return `${seconds}秒`;
        const minutes = Math.floor(seconds / 60);
        return `${minutes}分${seconds % 60}秒`;
    };

    return (
        <div className='space-y-6'>
            {/* 总体进度 */}
            <Card>
                <CardHeader>
                    <div className='flex items-center justify-between'>
                        <CardTitle className='text-lg'>转换进度</CardTitle>
                        <div className='flex items-center space-x-2'>
                            {batchTask.status === ConversionStatus.PROCESSING && onCancel && (
                                <Button variant='outline' size='sm' onClick={() => onCancel(batchTask)}>
                                    取消
                                </Button>
                            )}
                            {batchTask.status === ConversionStatus.COMPLETED && onDownloadAll && (
                                <Button size='sm' onClick={() => onDownloadAll(batchTask)} disabled={stats.completed === 0}>
                                    <Download className='w-4 h-4 mr-2' />
                                    批量下载 ({stats.completed})
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className='space-y-4'>
                    {/* 进度条 */}
                    <div className='space-y-2'>
                        <div className='flex justify-between text-sm'>
                            <span>
                                总进度: {stats.completed}/{stats.total}
                            </span>
                            <span>{batchTask.totalProgress}%</span>
                        </div>
                        <Progress value={batchTask.totalProgress} className='h-2' />
                    </div>

                    {/* 状态统计 */}
                    <div className='flex flex-wrap gap-2'>
                        {stats.completed > 0 && (
                            <Badge variant='default' className='bg-green-100 text-green-800'>
                                已完成: {stats.completed}
                            </Badge>
                        )}
                        {stats.processing > 0 && (
                            <Badge variant='default' className='bg-blue-100 text-blue-800'>
                                转换中: {stats.processing}
                            </Badge>
                        )}
                        {stats.pending > 0 && <Badge variant='secondary'>等待中: {stats.pending}</Badge>}
                        {stats.failed > 0 && <Badge variant='destructive'>失败: {stats.failed}</Badge>}
                    </div>

                    {/* 耗时信息 */}
                    {batchTask.completedAt && <div className='text-sm text-gray-600'>总耗时: {getTotalDuration()}</div>}
                </CardContent>
            </Card>

            {/* 错误提示 */}
            {stats.failed > 0 && (
                <Alert variant='destructive'>
                    <AlertCircle className='h-4 w-4' />
                    <AlertDescription>有 {stats.failed} 个文件转换失败，请检查文件格式或重新尝试。</AlertDescription>
                </Alert>
            )}

            {/* 任务列表 */}
            <Card>
                <CardHeader>
                    <CardTitle className='text-lg'>文件列表</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className='space-y-3 max-h-96 overflow-y-auto'>
                        {batchTask.tasks.map((task, index) => (
                            <div key={task.id} className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                                <div className='flex items-center space-x-3 min-w-0 flex-1'>
                                    {getStatusIcon(task.status)}

                                    <div className='min-w-0 flex-1'>
                                        <div className='flex items-center space-x-2'>
                                            <p className='text-sm font-medium truncate'>{task.fileName}</p>
                                            <Badge variant={getStatusColor(task.status) as any} className='text-xs'>
                                                {getStatusText(task.status)}
                                            </Badge>
                                        </div>

                                        <div className='flex items-center space-x-4 mt-1'>
                                            <p className='text-xs text-gray-500'>{formatFileSize(task.fileSize)}</p>

                                            {task.status === ConversionStatus.PROCESSING && (
                                                <div className='flex items-center space-x-2'>
                                                    <div className='w-20 bg-gray-200 rounded-full h-1'>
                                                        <div
                                                            className='bg-blue-500 h-1 rounded-full transition-all'
                                                            style={{ width: `${task.progress}%` }}
                                                        />
                                                    </div>
                                                    <span className='text-xs text-gray-500'>{task.progress}%</span>
                                                </div>
                                            )}

                                            {task.error && <p className='text-xs text-red-500 truncate'>{task.error}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* 操作按钮 */}
                                <div className='flex items-center space-x-1 ml-2'>
                                    {task.status === ConversionStatus.COMPLETED && (
                                        <>
                                            <Button
                                                variant='ghost'
                                                size='sm'
                                                onClick={() => handlePreview(task)}
                                                className='h-8 w-8 p-0'
                                                title='预览'
                                            >
                                                <Eye className='w-3 h-3' />
                                            </Button>
                                            <Button
                                                variant='ghost'
                                                size='sm'
                                                onClick={() => handleSingleDownload(task)}
                                                className='h-8 w-8 p-0'
                                                title='下载'
                                            >
                                                <Download className='w-3 h-3' />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* SVG预览对话框 */}
            <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
                <DialogContent className='max-w-4xl max-h-[90vh] overflow-hidden flex flex-col'>
                    <DialogHeader className='pb-4 border-b'>
                        <div className='flex items-center justify-between'>
                            <DialogTitle className='flex items-center gap-2'>
                                <Eye className='w-5 h-5 text-blue-600' />
                                SVG 预览
                            </DialogTitle>
                            <div className='flex items-center gap-2'>
                                {/* 缩放控制 */}
                                <div className='flex items-center gap-1 bg-gray-100 rounded-lg p-1'>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        onClick={handleZoomOut}
                                        className='h-8 w-8 p-0'
                                        disabled={previewScale <= 0.2}
                                    >
                                        <ZoomOut className='w-4 h-4' />
                                    </Button>
                                    <span className='text-sm font-mono min-w-[60px] text-center'>{Math.round(previewScale * 100)}%</span>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        onClick={handleZoomIn}
                                        className='h-8 w-8 p-0'
                                        disabled={previewScale >= 3}
                                    >
                                        <ZoomIn className='w-4 h-4' />
                                    </Button>
                                    <Button variant='ghost' size='sm' onClick={handleResetZoom} className='h-8 w-8 p-0' title='重置缩放'>
                                        <RotateCw className='w-4 h-4' />
                                    </Button>
                                </div>
                            </div>
                        </div>
                        {previewTask && <DialogDescription className='text-gray-600'>文件名: {previewTask.fileName}.svg</DialogDescription>}
                    </DialogHeader>

                    {/* 预览内容 */}
                    <div className='flex-1 overflow-auto p-4 bg-gray-50'>
                        <div className='flex items-center justify-center min-h-full'>
                            {previewTask?.svgContent ? (
                                <div 
                                    className='bg-white rounded-lg shadow-sm border p-4 transition-transform duration-200'
                                    style={{ 
                                        transform: `scale(${previewScale})`,
                                        transformOrigin: 'center'
                                    }}
                                >
                                    <div dangerouslySetInnerHTML={{ __html: previewTask.svgContent }} className='max-w-full max-h-full' />
                                </div>
                            ) : (
                                <div className='text-center text-gray-500'>
                                    <FileText className='w-12 h-12 mx-auto mb-4 text-gray-300' />
                                    <p>无法显示SVG内容</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 底部操作栏 */}
                    <DialogFooter className='border-t pt-4'>
                        <div className='flex items-center justify-between w-full'>
                            <div className='text-sm text-gray-500'>
                                {previewTask && (
                                    <>大小: {previewTask.svgContent ? Math.round(previewTask.svgContent.length / 1024) : 0} KB</>
                                )}
                            </div>
                            <div className='flex items-center gap-2'>
                                <Button
                                    variant='outline'
                                    onClick={() => previewTask && downloadService.downloadTaskSvg(previewTask)}
                                    className='gap-2'
                                >
                                    <Download className='w-4 h-4' />
                                    下载
                                </Button>
                                <Button variant='outline' onClick={handleClosePreview}>
                                    关闭
                                </Button>
                            </div>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

