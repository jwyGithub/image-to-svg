import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: '图片转SVG工具 - 在线批量转换',
    description: '快速将您的图片转换为SVG格式，支持JPG、PNG、GIF、WebP等格式，提供批量处理和历史记录管理功能',
    keywords: '图片转换, SVG, 在线工具, 批量转换, 图片处理',
    authors: [{ name: '图片转SVG工具' }],
    viewport: 'width=device-width, initial-scale=1'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang='zh-CN'>
            <body className='font-sans antialiased'>{children}</body>
        </html>
    );
}

