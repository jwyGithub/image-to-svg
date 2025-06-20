import { SvgTemplateParams, ImageInfo, ErrorType, ConversionError } from './types';

/**
 * SVG模板字符串
 */
const SVG_TEMPLATE = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="{{width}}" height="{{height}}" viewBox="0 0 {{width}} {{height}}" enable-background="new 0 0 {{width}} {{height}}" xml:space="preserve">
  <image id="image0" width="{{width}}" height="{{height}}" x="0" y="0" href="{{base64}}" />
</svg>`;

/**
 * SVG模板工具类
 */
export class SvgTemplateService {
  /**
   * 将文件转换为Base64格式
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
                 } else {
           const error = new ConversionError({
             type: ErrorType.FILE_READ_ERROR,
             message: '文件读取结果不是字符串格式'
           });
           reject(error);
         }
      };
      
             reader.onerror = () => {
         const error = new ConversionError({
           type: ErrorType.FILE_READ_ERROR,
           message: '无法读取文件内容',
           details: reader.error
         });
         reject(error);
       };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * 获取图片尺寸信息
   */
  async getImageInfo(file: File): Promise<ImageInfo> {
    return new Promise(async (resolve, reject) => {
      try {
        // 先获取Base64数据
        const base64 = await this.fileToBase64(file);
        
        // 创建Image对象来获取尺寸
        const img = new Image();
        
        img.onload = () => {
          resolve({
            width: img.width,
            height: img.height,
            base64
          });
        };
        
                 img.onerror = () => {
           const error = new ConversionError({
             type: ErrorType.IMAGE_LOAD_ERROR,
             message: '无法加载图片以获取尺寸信息'
           });
           reject(error);
         };
        
        img.src = base64;
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 使用模板参数生成SVG内容
   */
  generateSvg(params: SvgTemplateParams): string {
    let svgContent = SVG_TEMPLATE;
    
    // 替换所有模板变量
    svgContent = svgContent.replace(/\{\{width\}\}/g, params.width.toString());
    svgContent = svgContent.replace(/\{\{height\}\}/g, params.height.toString());
    svgContent = svgContent.replace(/\{\{base64\}\}/g, params.base64);
    
    return svgContent;
  }

  /**
   * 将文件转换为SVG
   */
  async convertFileToSvg(file: File): Promise<string> {
    try {
      // 获取图片信息（包含Base64和尺寸）
      const imageInfo = await this.getImageInfo(file);
      
      // 使用模板生成SVG
      const svgContent = this.generateSvg({
        width: imageInfo.width,
        height: imageInfo.height,
        base64: imageInfo.base64
      });
      
      return svgContent;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 验证文件是否为支持的图片格式
   */
  validateImageFile(file: File): boolean {
    const supportedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml'
    ];
    
    return supportedTypes.includes(file.type);
  }

  /**
   * 获取文件名（不含扩展名）
   */
  getFileNameWithoutExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return fileName;
    }
    return fileName.substring(0, lastDotIndex);
  }

  /**
   * 生成SVG文件名
   */
  generateSvgFileName(originalFileName: string): string {
    const nameWithoutExt = this.getFileNameWithoutExtension(originalFileName);
    return `${nameWithoutExt}.svg`;
  }
}

// 导出单例实例
export const svgTemplateService = new SvgTemplateService(); 
