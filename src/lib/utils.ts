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

export function compressImage(file: File, maxW = 1000, maxH = 1000, quality = 0.7): Promise<string> {
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
          resolve(event.target?.result as string);
          return;
        }

        // For non-PNGs, fill background with white to avoid black backgrounds on JPEG compression
        const isPng = file.type === 'image/png' || file.name?.endsWith('.png');
        
        if (!isPng) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        } else {
          // PNG supports transparency. WebP supports transparency & is up to 80% lighter than PNG.
          ctx.drawImage(img, 0, 0, width, height);
          const webpBase64 = canvas.toDataURL('image/webp', quality);
          if (webpBase64.startsWith('data:image/webp')) {
            resolve(webpBase64);
          } else {
            // Graceful fallback to standard PNG if webp is not supported by the client canvas context
            const pngBase64 = canvas.toDataURL('image/png');
            resolve(pngBase64);
          }
        }
      };
      img.onerror = (err) => {
        reject(err);
      };
    };
    reader.onerror = (err) => {
      reject(err);
    };
  });
}

export function compressBase64Image(base64Str: string, maxW = 600, maxH = 600, quality = 0.65): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!base64Str || !base64Str.startsWith('data:image/')) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.src = base64Str;
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
        resolve(base64Str);
        return;
      }

      const isPng = base64Str.includes('image/png');

      if (!isPng) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      } else {
        ctx.drawImage(img, 0, 0, width, height);
        const webpBase64 = canvas.toDataURL('image/webp', quality);
        if (webpBase64.startsWith('data:image/webp')) {
          resolve(webpBase64);
        } else {
          const pngBase64 = canvas.toDataURL('image/png');
          resolve(pngBase64);
        }
      }
    };
    img.onerror = (err) => {
      reject(err);
    };
  });
}
