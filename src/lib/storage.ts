import { supabase } from './supabase';

export type BucketName = 'customer-documents' | 'payment-proofs' | 'visa-files' | 'flight-tickets';

/**
 * Uploads a file to Supabase Storage bucket and returns public URL
 */
export async function uploadToSupabaseStorage(
  bucket: BucketName,
  path: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  try {
    const fileExt = file.name.split('.').pop();
    const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const fullPath = `${path.replace(/^\/+|\/+$/g, '')}/${cleanFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fullPath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return { url: null, error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fullPath);
    return { url: publicUrlData.publicUrl, error: null };
  } catch (err) {
    console.error('Upload exception:', err);
    return { url: null, error: (err as Error).message };
  }
}

/**
 * Deletes a file from Supabase Storage by public URL or relative path
 */
export async function deleteFromSupabaseStorage(
  bucket: BucketName,
  filePathOrUrl: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    let relativePath = filePathOrUrl;
    if (filePathOrUrl.startsWith('http')) {
      const parts = filePathOrUrl.split(`/${bucket}/`);
      if (parts.length > 1) {
        relativePath = parts[1];
      }
    }

    const { error } = await supabase.storage.from(bucket).remove([relativePath]);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
