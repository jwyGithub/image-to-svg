'use client';

import React, { useCallback, useState } from 'react';
import { Upload, FileImage, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { svgTemplateService } from '@/lib/svg-template';

interface FileUploadProps {
    onFilesSelected: (files: File[]) => void;
    disabled?: boolean;
}

/**
 * 文件上传组件
 */
export function FileUpload({ onFilesSelected, disabled = false }: FileUploadProps) {
    const [dragOver, setDragOver] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [error, setError] = useState<string>('');

    // 验证文件
    const validateFiles = useCallback((files: File[]): { validFiles: File[]; errors: string[] } => {
        const validFiles: File[] = [];
        const errors: string[] = [];

        files.forEach(file => {
            // 检查文件类型
            if (!svgTemplateService.validateImageFile(file)) {
                errors.push(`"${file.name}" 不是支持的图片格式`);
                return;
            }

            // 检查文件大小（限制为10MB）
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                errors.push(`"${file.name}" 文件过大，请选择小于10MB的文件`);
                return;
            }

            validFiles.push(file);
        });

        return { validFiles, errors };
    }, []);

    // 处理文件选择
    const handleFilesChange = useCallback(
        (files: File[]) => {
            const { validFiles, errors } = validateFiles(files);

            if (errors.length > 0) {
                setError(errors.join('; '));
            } else {
                setError('');
            }

            // 移除文件数量限制，允许选择任意数量的文件

            // 去除重复文件
            const newFiles = validFiles.filter(
                newFile => !selectedFiles.some(existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size)
            );

            if (newFiles.length > 0) {
                const updatedFiles = [...selectedFiles, ...newFiles];
                setSelectedFiles(updatedFiles);
                onFilesSelected(updatedFiles);
            }
        },
        [selectedFiles, validateFiles, onFilesSelected]
    );

    // 拖拽处理
    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            if (!disabled) {
                setDragOver(true);
            }
        },
        [disabled]
    );

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);

            if (disabled) return;

            const files = Array.from(e.dataTransfer.files);
            handleFilesChange(files);
        },
        [disabled, handleFilesChange]
    );

    // 文件输入处理
    const handleFileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(e.target.files || []);
            handleFilesChange(files);
            // 清空input值，允许重复选择同一文件
            e.target.value = '';
        },
        [handleFilesChange]
    );

    // 移除文件
    const removeFile = useCallback(
        (index: number) => {
            const updatedFiles = selectedFiles.filter((_, i) => i !== index);
            setSelectedFiles(updatedFiles);
            onFilesSelected(updatedFiles);
        },
        [selectedFiles, onFilesSelected]
    );

    // 清空所有文件
    const clearAllFiles = useCallback(() => {
        setSelectedFiles([]);
        onFilesSelected([]);
        setError('');
    }, [onFilesSelected]);

    // 格式化文件大小
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className='w-full space-y-4'>
            {/* 上传区域 */}
            <Card
                className={`
          border-2 border-dashed transition-colors duration-200 cursor-pointer
          ${dragOver ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <CardContent className='p-8 text-center'>
                    <input
                        type='file'
                        multiple
                        accept='image/*'
                        onChange={handleFileInputChange}
                        disabled={disabled}
                        className='hidden'
                        id='file-upload-input'
                    />

                    <label htmlFor='file-upload-input' className='cursor-pointer'>
                        <div className='flex flex-col items-center space-y-4'>
                            <div className='p-4 bg-gray-100 rounded-full'>
                                <Upload className='w-8 h-8 text-gray-600' />
                            </div>

                            <div className='text-center'>
                                <p className='text-lg font-medium text-gray-700'>拖拽图片到此处或点击选择文件</p>
                                <p className='text-sm text-gray-500 mt-1'>支持 JPG、PNG、GIF、WebP、BMP 格式，最大 10MB</p>
                                <p className='text-xs text-gray-400 mt-1'>支持批量选择多个文件</p>
                            </div>
                        </div>
                    </label>
                </CardContent>
            </Card>

            {/* 错误信息 */}
            {error && (
                <Alert variant='destructive'>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* 已选择文件列表 */}
            {selectedFiles.length > 0 && (
                <Card>
                    <CardContent className='p-4'>
                        <div className='flex items-center justify-between mb-4'>
                            <h3 className='text-lg font-medium'>已选择文件 ({selectedFiles.length})</h3>
                            <Button variant='outline' size='sm' onClick={clearAllFiles} disabled={disabled}>
                                清空所有
                            </Button>
                        </div>

                        <div className='grid gap-2 max-h-60 overflow-y-auto'>
                            {selectedFiles.map((file, index) => (
                                <div key={`${file.name}-${index}`} className='flex items-center justify-between p-2 bg-gray-50 rounded-md'>
                                    <div className='flex items-center space-x-3 min-w-0 flex-1'>
                                        <FileImage className='w-4 h-4 text-gray-500 flex-shrink-0' />
                                        <div className='min-w-0 flex-1'>
                                            <p className='text-sm font-medium truncate'>{file.name}</p>
                                            <p className='text-xs text-gray-500'>{formatFileSize(file.size)}</p>
                                        </div>
                                    </div>

                                    <div className='flex items-center space-x-2'>
                                        <Badge variant='secondary' className='text-xs'>
                                            {file.type.split('/')[1]?.toUpperCase()}
                                        </Badge>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            onClick={() => removeFile(index)}
                                            disabled={disabled}
                                            className='h-6 w-6 p-0'
                                        >
                                            <X className='w-3 h-3' />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

