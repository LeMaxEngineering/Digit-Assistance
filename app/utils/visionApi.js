import Constants from 'expo-constants';

/**
 * Processes an array of base64-encoded images using Google Cloud Vision API.
 * @param {string[]} images - Array of base64-encoded image strings.
 * @returns {Promise<object>} The parsed Vision API response.
 */
export const processDocumentImages = async (images) => {
  const apiKey = Constants.expoConfig?.extra?.googleVisionApiKey;
  if (!apiKey) {
    throw new Error('Google Vision API key is missing. Please set it in your environment.');
  }
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

  const requests = images.map(image => ({
    image: { content: image },
    features: [{ type: 'TEXT_DETECTION' }]
  }));

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to process images');
  }

  const result = await response.json();
  return result;
};

export async function ocrImagesWithGoogleVision(images, apiKey) {
  // Debug: Log API key (first 10 chars only for security)
  console.log('API Key (first 10 chars):', apiKey ? `${apiKey.substring(0, 10)}...` : 'undefined');
  
  if (!apiKey) {
    throw new Error('Google Vision API key is missing. Please set it in your environment.');
  }

  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('No images provided for OCR processing');
  }

  const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
  
  // Debug: Log request details
  console.log('Request URL:', url);
  console.log('Number of images:', images.length);
  
  // Process images in batches of 16 (Google Vision API limit)
  const batchSize = 16;
  const results = [];
  
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(images.length/batchSize)}`);
    
    const requests = batch.map(base64 => ({
      image: { content: base64 },
      features: [{ type: 'TEXT_DETECTION' }]
    }));

    try {
      // Debug: Log request payload size
      const payload = JSON.stringify({ requests });
      console.log(`Batch ${Math.floor(i/batchSize) + 1} payload size:`, payload.length, 'bytes');

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Vision API Error:', error);
        throw new Error(error.error?.message || 'Failed to process images');
      }

      const result = await response.json();
      
      if (!result.responses) {
        throw new Error('Invalid response from Google Vision API');
      }

      // Add batch results to the main results array
      results.push(...result.responses);
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < images.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Error processing batch ${Math.floor(i/batchSize) + 1}:`, error);
      throw error;
    }
  }

  // Validate that we got results for all images
  if (results.length !== images.length) {
    console.warn(`Warning: Expected ${images.length} results but got ${results.length}`);
  }

  return results;
} 