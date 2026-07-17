import { Platform } from 'react-native';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { ResponsePayload } from '../types';

/**
 * Upload a local media URI to Supabase Storage.
 * Returns a public URL on success.
 *
 * Mobile: FormData with a { uri, type, name } file object sent via a raw
 *   fetch() call that bypasses @supabase/storage-js entirely. React Native's
 *   native networking layer reads the file:// URI directly, so the actual
 *   JPEG bytes reach the server. We cannot use the Supabase JS SDK here
 *   because it always sets an explicit Content-Type header, which overwrites
 *   FormData's required multipart/form-data boundary and breaks the upload.
 *   Passing ArrayBuffer or Blob([Uint8Array]) through the JS layer also
 *   silently produces 0-byte uploads in React Native.
 *
 * Web: base64 → materialised Blob → Supabase JS SDK upload.
 *   fetch(blobUri).blob() fails for unsupported formats like HEIC in Chrome,
 *   so we use the base64 string from expo-image-picker instead.
 */
export async function uploadMedia(
  localUri: string,
  base64?: string | null
): Promise<ResponsePayload<{ mediaUrl: string }>> {
  if (!localUri || !localUri.trim()) {
    return { status: 'error', message: 'No media URI provided.', data: null };
  }

  try {
    const filename = `skill-media/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

    if (Platform.OS !== 'web') {
      // ── Mobile ──────────────────────────────────────────────────────────
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? supabaseAnonKey;

      const formData = new FormData();
      formData.append('file', {
        uri: localUri,
        type: 'image/jpeg',
        name: filename.split('/').pop()!,
      } as any);

      const res = await fetch(
        `${supabaseUrl}/storage/v1/object/media/${filename}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: supabaseAnonKey,
            'x-upsert': 'false',
          },
          body: formData,
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        return { status: 'upload_error', message: errText, data: null };
      }
    } else {
      // ── Web ─────────────────────────────────────────────────────────────
      if (!base64) {
        return { status: 'error', message: 'No image data available.', data: null };
      }
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' });

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filename, blob, { contentType: 'image/jpeg', upsert: false });

      if (uploadError) {
        return { status: 'upload_error', message: uploadError.message, data: null };
      }
    }

    const { data } = supabase.storage.from('media').getPublicUrl(filename);
    return { status: 'success', data: { mediaUrl: data.publicUrl } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { status: 'error', message, data: null };
  }
}
