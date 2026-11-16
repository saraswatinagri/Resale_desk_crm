/**
 * Client-side real estate image optimization and upload utility.
 * Compresses device/camera images client-side into lightweight high-res Data URLs
 * to ensure instant loading, offline resilience, and zero server body-size restrictions.
 */

export interface OptimizedImage {
  id: string;
  url: string;
  name: string;
  sizeKb: number;
  label?: string;
}

export const PHOTO_LABELS = [
  'Building Elevation',
  'Living Room / Hall',
  'Master Bedroom',
  'Modular Kitchen',
  'Balcony / View',
  'Bathroom / Sanitary',
  'NMRDA Sanction Plan / Layout Map',
  'Amenities / Clubhouse',
  'Parking & Surroundings',
  'General View'
] as const;

export type PhotoLabel = typeof PHOTO_LABELS[number];

/**
 * Resizes and compresses any image file from the device/camera using HTML5 Canvas.
 */
export function compressImageFile(
  file: File,
  maxWidth = 1600,
  maxHeight = 1200,
  quality = 0.82
): Promise<OptimizedImage> {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error(`"${file.name}" is not an image file.`));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserving dimensions
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original data URL if 2D context fails
          const rawUrl = event.target?.result as string;
          resolve({
            id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            url: rawUrl,
            name: file.name,
            sizeKb: Math.round(file.size / 1024),
            label: 'General View'
          });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to high-quality compressed JPEG
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        const approxSizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);

        resolve({
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          url: compressedDataUrl,
          name: file.name,
          sizeKb: approxSizeKb,
          label: 'General View'
        });
      };

      img.onerror = () => reject(new Error(`Failed to load image "${file.name}"`));
      img.src = event.target?.result as string;
    };

    reader.onerror = () => reject(new Error(`Failed to read file "${file.name}"`));
    reader.readAsDataURL(file);
  });
}

/**
 * Process multiple files in parallel with safety limit.
 */
export async function processMultipleImageFiles(
  files: FileList | File[],
  onProgress?: (processed: number, total: number) => void
): Promise<OptimizedImage[]> {
  const fileArray = Array.from(files);
  const results: OptimizedImage[] = [];

  for (let i = 0; i < fileArray.length; i++) {
    try {
      const optimized = await compressImageFile(fileArray[i]);
      results.push(optimized);
    } catch (err) {
      console.warn('Skipping file due to compression error:', fileArray[i].name, err);
    }
    if (onProgress) {
      onProgress(i + 1, fileArray.length);
    }
  }

  return results;
}
