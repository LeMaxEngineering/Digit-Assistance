import { supabase } from '../config/supabase';

/**
 * Uploads a file buffer to the 'documents' storage bucket in Supabase.
 * @param {Buffer|Uint8Array} fileBuffer - The file content as a buffer.
 * @param {string} fileName - The name to save the file as (e.g., 'doc123.pdf').
 * @param {string} mimeType - The MIME type of the file (e.g., 'application/pdf').
 * @returns {Promise<object>} The upload response data.
 */
export const uploadDocumentToSupabase = async (fileBuffer, fileName, mimeType) => {
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(fileName, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });
  if (error) throw error;
  return data;
};

/**
 * Saves document metadata to the 'documents' table.
 * @param {object} metadata - The document metadata (code, company_id, document_date, file_url, etc.).
 * @returns {Promise<object>} The inserted document row.
 */
export const saveDocumentMetadata = async (metadata) => {
  const { data, error } = await supabase
    .from('documents')
    .insert([metadata])
    .select()
    .single();
  if (error) throw error;
  return data;
};

/**
 * Gets the public URL for a file in the 'documents' storage bucket.
 * @param {string} fileName - The file name (e.g., 'doc123.pdf').
 * @returns {string} The public URL for the file.
 */
export const getDocumentPublicUrl = (fileName) => {
  const { data } = supabase.storage
    .from('documents')
    .getPublicUrl(fileName);
  return data.publicUrl;
}; 