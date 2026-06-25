import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

export function formatQuantityUnit(unit: string | undefined | null): string {
  if (!unit) return '';
  let cleaned = unit.trim();
  
  const lowerUnit = cleaned.toLowerCase();
  if (lowerUnit === 'g') {
    cleaned = 'gram';
  } else if (lowerUnit === 'l') {
    cleaned = 'liter';
  }
  
  if (cleaned.length <= 2) {
    return cleaned.toLowerCase();
  } else {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  }
}

export interface CompressedImageResult {
  dataUrl: string;
  format: 'avif' | 'webp' | 'jpeg' | 'png';
  originalSizeKb: number;
  compressedSizeKb: number;
  savingsPercent: number;
}

export function compressImageToAvif(
  file: File,
  maxW = 1000,
  maxH = 1000,
  quality = 0.7
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxW) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          }
        } else {
          if (height > maxH) {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const originalSizeKb = file.size / 1024;
          resolve({
            dataUrl: event.target?.result as string,
            format: 'png',
            originalSizeKb,
            compressedSizeKb: originalSizeKb,
            savingsPercent: 0,
          });
          return;
        }

        // Apply high quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const originalSizeKb = file.size / 1024;

        // Try AVIF first
        let dataUrl = canvas.toDataURL('image/avif', quality);
        let format: 'avif' | 'webp' | 'jpeg' | 'png' = 'avif';

        if (!dataUrl.startsWith('data:image/avif')) {
          // Fallback to WebP
          dataUrl = canvas.toDataURL('image/webp', quality);
          format = 'webp';

          if (!dataUrl.startsWith('data:image/webp')) {
            // Fallback to JPEG/PNG
            const isPng = file.type === 'image/png' || file.name?.toLowerCase().endsWith('.png');
            if (isPng) {
              dataUrl = canvas.toDataURL('image/png');
              format = 'png';
            } else {
              ctx.clearRect(0, 0, width, height);
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);
              dataUrl = canvas.toDataURL('image/jpeg', quality);
              format = 'jpeg';
            }
          }
        }

        // Base64 size estimation (Base64 character is 6 bits, binary is 8 bits -> 0.75 ratio)
        const compressedSizeKb = (dataUrl.length * 0.75) / 1024;
        const savingsPercent = Math.max(0, Math.round((1 - (compressedSizeKb / originalSizeKb)) * 100));

        resolve({
          dataUrl,
          format,
          originalSizeKb,
          compressedSizeKb,
          savingsPercent,
        });
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export function compressImage(file: File, maxW = 1000, maxH = 1000, quality = 0.7): Promise<string> {
  return compressImageToAvif(file, maxW, maxH, quality).then((res) => res.dataUrl);
}

export function cleanCategoryName(categoryName: string | undefined | null): string {
  if (!categoryName) return '';
  return categoryName.split('(')[0].trim();
}

