'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    History,
    Trash2,
    Download,
    Eye,
    Calendar,
    FileText,
    AlertCircle,
    RefreshCw,
    Clock,
    CheckCircle2,
    XCircle,
    Search,
    Filter,
    Grid,
    List,
    X,
    ZoomIn,
    ZoomOut,
    RotateCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConversionHistory, ConversionStatus, ConversionTask } from '@/lib/types';
import { storageService } from '@/lib/storage';
import { downloadService } from '@/lib/download';

interface HistoryPanelProps {
    onHistorySelect?: (history: ConversionHistory) => void;
}

type ViewMode = 'list' | 'grid';

/**
 * 历史记录面板组件
 */
export function HistoryPanel({ onHistorySelect }: HistoryPanelProps) {
    const [histories, setHistories] = useState<ConversionHistory[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedHistory, setSelectedHistory] = useState<ConversionHistory | null>(null);
    const [storageInfo, setStorageInfo] = useState<{ count: number; estimatedSize: number }>({ count: 0, estimatedSize: 0 });
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
    const [previewTask, setPreviewTask] = useState<ConversionTask | null>(null);
    const [previewScale, setPreviewScale] = useState(1);

    // 加载历史记录
    const loadHistories = async () => {
        setLoading(true);
        setError('');

        try {
            const historyList = await storageService.getAllHistory();
            setHistories(historyList);

            const info = await storageService.getStorageInfo();
            setStorageInfo(info);
        } catch (err) {
            setError(err instanceof Error ? err.message : '获取历史记录失败');
        } finally {
            setLoading(false);
        }
    };

    // 格式化日期
    const formatDate = (date: Date): string => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60 * 1000) {
            return '刚刚';
        } else if (diff < 60 * 60 * 1000) {
            return `${Math.floor(diff / (60 * 1000))}分钟前`;
        } else if (diff < 24 * 60 * 60 * 1000) {
            return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
        } else if (diff < 7 * 24 * 60 * 60 * 1000) {
            return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`;
        } else {
            return date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    };

    // 初始化加载
    useEffect(() => {
        loadHistories();
    }, []);

    // 搜索过滤
    const filteredHistories = useMemo(() => {
        if (!searchQuery.trim()) return histories;

        const query = searchQuery.toLowerCase();
        return histories.filter(history => {
            // 搜索文件名
            const hasMatchingFile = history.batch.tasks.some(task => task.fileName.toLowerCase().includes(query));

            // 搜索日期
            const dateStr = formatDate(new Date(history.savedAt)).toLowerCase();
            const hasMatchingDate = dateStr.includes(query);

            return hasMatchingFile || hasMatchingDate;
        });
    }, [histories, searchQuery]);

    // 删除单个历史记录
    const handleDeleteHistory = async (history: ConversionHistory) => {
        try {
            await storageService.deleteHistory(history.id);
            await loadHistories();
            setDeleteDialogOpen(false);
            setSelectedHistory(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : '删除历史记录失败');
        }
    };

    // 清空所有历史记录
    const handleClearAllHistory = async () => {
        try {
            await storageService.clearAllHistory();
            setHistories([]);
            setStorageInfo({ count: 0, estimatedSize: 0 });
        } catch (err) {
            setError(err instanceof Error ? err.message : '清空历史记录失败');
        }
    };

    // 下载历史记录的所有文件
    const handleDownloadBatch = async (history: ConversionHistory) => {
        try {
            await downloadService.downloadBatchSvg(history.batch);
        } catch (err) {
            setError(err instanceof Error ? err.message : '下载失败');
        }
    };

    // 预览单个文件
    const handlePreviewFile = (task: ConversionTask) => {
        if (task.status !== ConversionStatus.COMPLETED || !task.svgContent) {
            setError('任务未完成或SVG内容不存在');
            return;
        }
        setPreviewTask(task);
        setPreviewScale(1);
        setPreviewDialogOpen(true);
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

    // 切换行展开状态
    const toggleRowExpanded = (historyId: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(historyId)) {
            newExpanded.delete(historyId);
        } else {
            newExpanded.add(historyId);
        }
        setExpandedRows(newExpanded);
    };

    // 格式化文件大小
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // 获取批次统计信息
    const getBatchStats = (history: ConversionHistory) => {
        const tasks = history.batch.tasks;
        return {
            total: tasks.length,
            completed: tasks.filter(t => t.status === ConversionStatus.COMPLETED).length,
            failed: tasks.filter(t => t.status === ConversionStatus.FAILED).length
        };
    };

    return (
        <>
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant='outline' size='sm' className='gap-2'>
                        <History className='w-4 h-4' />
                        历史记录
                        {storageInfo.count > 0 && (
                            <Badge variant='secondary' className='ml-1 min-w-[20px] h-5'>
                                {storageInfo.count}
                            </Badge>
                        )}
                    </Button>
                </SheetTrigger>
                <SheetContent className='w-full sm:w-[800px] sm:max-w-none overflow-hidden flex flex-col'>
                    <SheetHeader className='pb-4 border-b'>
                        <SheetTitle className='flex items-center gap-3 text-xl'>
                            <div className='w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center'>
                                <History className='w-4 h-4 text-blue-600' />
                            </div>
                            转换历史记录
                        </SheetTitle>
                        <SheetDescription className='text-gray-600'>查看和管理您的图片转换历史记录</SheetDescription>
                    </SheetHeader>

                    <div className='flex-1 overflow-hidden flex flex-col'>
                        {/* 搜索和操作栏 */}
                        <div className='p-4 space-y-4 border-b bg-gray-50/50'>
                            {/* 搜索框 */}
                            <div className='relative'>
                                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                                <Input
                                    placeholder='搜索文件名或日期...'
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className='pl-10 pr-4'
                                />
                            </div>

                            {/* 统计和操作 */}
                            <div className='flex items-center justify-between'>
                                <div className='text-sm text-gray-600'>
                                    {searchQuery ? (
                                        <>
                                            找到 <span className='font-medium text-gray-900'>{filteredHistories.length}</span> 条记录
                                        </>
                                    ) : (
                                        <>
                                            共 <span className='font-medium text-gray-900'>{storageInfo.count}</span> 条记录，约占用{' '}
                                            <span className='font-medium text-gray-900'>{formatFileSize(storageInfo.estimatedSize)}</span>
                                        </>
                                    )}
                                </div>
                                <div className='flex items-center gap-2'>
                                    <Button variant='ghost' size='sm' onClick={loadHistories} disabled={loading} className='gap-2'>
                                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                        刷新
                                    </Button>
                                    {histories.length > 0 && (
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            onClick={handleClearAllHistory}
                                            className='text-red-600 hover:text-red-700 hover:bg-red-50 gap-2'
                                        >
                                            <Trash2 className='w-4 h-4' />
                                            清空全部
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* 错误提示 */}
                            {error && (
                                <Alert variant='destructive'>
                                    <AlertCircle className='h-4 w-4' />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                        </div>

                        {/* 历史记录列表 */}
                        <div className='flex-1 overflow-y-auto p-4'>
                            {loading ? (
                                <div className='flex flex-col items-center justify-center py-16 text-gray-500'>
                                    <RefreshCw className='w-8 h-8 animate-spin mb-4' />
                                    <p className='text-lg font-medium mb-2'>加载中...</p>
                                    <p className='text-sm'>正在获取您的转换历史记录</p>
                                </div>
                            ) : filteredHistories.length === 0 ? (
                                <div className='flex flex-col items-center justify-center py-16 text-gray-500'>
                                    <div className='w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6'>
                                        <FileText className='w-10 h-10 text-gray-400' />
                                    </div>
                                    <h3 className='text-lg font-medium text-gray-900 mb-2'>
                                        {searchQuery ? '未找到匹配的记录' : '暂无转换历史记录'}
                                    </h3>
                                    <p className='text-sm text-gray-500 text-center max-w-sm'>
                                        {searchQuery ? '尝试修改搜索关键词' : '开始上传图片进行转换，转换完成后会自动保存到这里'}
                                    </p>
                                </div>
                            ) : (
                                <div className='border rounded-lg overflow-hidden bg-white'>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className='w-[120px]'>时间</TableHead>
                                                <TableHead>文件信息</TableHead>
                                                <TableHead className='w-[120px]'>状态</TableHead>
                                                <TableHead className='w-[100px]'>耗时</TableHead>
                                                <TableHead className='w-[120px] text-right'>操作</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredHistories.map(history => {
                                                const stats = getBatchStats(history);
                                                const isExpanded = expandedRows.has(history.id);
                                                
                                                // 确保日期是Date对象，如果是字符串则转换
                                                const completedAt = history.batch.completedAt 
                                                    ? (typeof history.batch.completedAt === 'string' 
                                                        ? new Date(history.batch.completedAt) 
                                                        : history.batch.completedAt)
                                                    : null;
                                                const createdAt = typeof history.batch.createdAt === 'string' 
                                                    ? new Date(history.batch.createdAt) 
                                                    : history.batch.createdAt;
                                                
                                                const duration = completedAt
                                                    ? Math.round((completedAt.getTime() - createdAt.getTime()) / 1000)
                                                    : 0;

                                                return (
                                                    <React.Fragment key={history.id}>
                                                        <TableRow
                                                            className='cursor-pointer hover:bg-gray-50'
                                                            onClick={() => toggleRowExpanded(history.id)}
                                                        >
                                                                                                        <TableCell className='font-medium text-sm'>
                                                {formatDate(typeof history.savedAt === 'string' ? new Date(history.savedAt) : history.savedAt)}
                                            </TableCell>
                                                            <TableCell>
                                                                <div className='space-y-1'>
                                                                    <div className='flex items-center gap-2'>
                                                                        <Badge variant='outline' className='text-xs'>
                                                                            {stats.total} 个文件
                                                                        </Badge>
                                                                        {isExpanded ? (
                                                                            <span className='text-xs text-gray-500'>点击收起</span>
                                                                        ) : (
                                                                            <span className='text-xs text-gray-500'>点击展开详情</span>
                                                                        )}
                                                                    </div>
                                                                    {!isExpanded && (
                                                                        <div className='text-sm text-gray-600 truncate max-w-[300px]'>
                                                                            {history.batch.tasks
                                                                                .slice(0, 3)
                                                                                .map(t => t.fileName)
                                                                                .join(', ')}
                                                                            {history.batch.tasks.length > 3 &&
                                                                                ` 等${history.batch.tasks.length}个文件`}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                                                                        <TableCell>
                                                <div className='flex items-center gap-1'>
                                                    {stats.total === stats.completed ? (
                                                        <Badge variant='default' className='bg-green-100 text-green-700 text-xs'>
                                                            全部成功
                                                        </Badge>
                                                    ) : stats.failed > 0 ? (
                                                        <div className='flex items-center gap-1'>
                                                            {stats.completed > 0 && (
                                                                <Badge variant='default' className='bg-green-100 text-green-700 text-xs'>
                                                                    成功 {stats.completed}
                                                                </Badge>
                                                            )}
                                                            <Badge variant='destructive' className='text-xs'>
                                                                失败 {stats.failed}
                                                            </Badge>
                                                        </div>
                                                    ) : (
                                                        <Badge variant='secondary' className='text-xs'>
                                                            处理中
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                                                                                        <TableCell className='text-sm text-gray-600'>
                                                {duration > 0 ? (
                                                    duration >= 60 ? 
                                                        `${Math.floor(duration / 60)}分${duration % 60}秒` : 
                                                        `${duration}秒`
                                                ) : '-'}
                                            </TableCell>
                                                            <TableCell className='text-right'>
                                                                <div className='flex items-center justify-end gap-1'>
                                                                    {stats.completed > 0 && (
                                                                        <Button
                                                                            variant='ghost'
                                                                            size='sm'
                                                                            onClick={e => {
                                                                                e.stopPropagation();
                                                                                handleDownloadBatch(history);
                                                                            }}
                                                                            className='h-8 w-8 p-0 hover:bg-blue-100'
                                                                            title='批量下载'
                                                                        >
                                                                            <Download className='w-4 h-4 text-blue-600' />
                                                                        </Button>
                                                                    )}
                                                                    <Button
                                                                        variant='ghost'
                                                                        size='sm'
                                                                        onClick={e => {
                                                                            e.stopPropagation();
                                                                            setSelectedHistory(history);
                                                                            setDeleteDialogOpen(true);
                                                                        }}
                                                                        className='h-8 w-8 p-0 hover:bg-red-100'
                                                                        title='删除记录'
                                                                    >
                                                                        <Trash2 className='w-4 h-4 text-red-600' />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>

                                                        {/* 展开的文件详情 */}
                                                        {isExpanded && (
                                                            <TableRow>
                                                                <TableCell colSpan={5} className='bg-gray-50/50 p-4'>
                                                                    <div className='space-y-2'>
                                                                        <h4 className='font-medium text-sm text-gray-900 mb-3'>
                                                                            文件列表：
                                                                        </h4>
                                                                        <div className='grid grid-cols-1 gap-2 max-h-40 overflow-y-auto'>
                                                                            {history.batch.tasks.map((task, index) => (
                                                                                <div
                                                                                    key={task.id}
                                                                                    className='flex items-center justify-between py-2 px-3 bg-white rounded border'
                                                                                >
                                                                                    <div className='flex items-center gap-3 min-w-0 flex-1'>
                                                                                        <div
                                                                                            className={`w-2 h-2 rounded-full ${
                                                                                                task.status === ConversionStatus.COMPLETED
                                                                                                    ? 'bg-green-500'
                                                                                                    : 'bg-red-400'
                                                                                            }`}
                                                                                        />
                                                                                        <span className='text-sm text-gray-700 truncate'>
                                                                                            {task.fileName}.svg
                                                                                        </span>
                                                                                        <Badge variant='outline' className='text-xs'>
                                                                                            {task.status === ConversionStatus.COMPLETED
                                                                                                ? '成功'
                                                                                                : '失败'}
                                                                                        </Badge>
                                                                                    </div>
                                                                                    {task.status === ConversionStatus.COMPLETED && (
                                                                                        <Button
                                                                                            variant='ghost'
                                                                                            size='sm'
                                                                                            onClick={e => {
                                                                                                e.stopPropagation();
                                                                                                handlePreviewFile(task);
                                                                                            }}
                                                                                            className='h-7 w-7 p-0 hover:bg-gray-100'
                                                                                            title='预览文件'
                                                                                        >
                                                                                            <Eye className='w-3 h-3 text-gray-500' />
                                                                                        </Button>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* 删除确认对话框 */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className='max-w-md'>
                    <DialogHeader>
                        <DialogTitle className='flex items-center gap-2'>
                            <AlertCircle className='w-5 h-5 text-red-500' />
                            确认删除
                        </DialogTitle>
                        <DialogDescription className='text-gray-600'>
                            确定要删除这条历史记录吗？此操作无法撤销，将永久删除相关的转换记录。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className='gap-2'>
                        <Button variant='outline' onClick={() => setDeleteDialogOpen(false)}>
                            取消
                        </Button>
                        <Button
                            variant='destructive'
                            onClick={() => selectedHistory && handleDeleteHistory(selectedHistory)}
                            className='gap-2'
                        >
                            <Trash2 className='w-4 h-4' />
                            确认删除
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
        </>
    );
}

