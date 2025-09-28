
const isDevelopment = process.env.NODE_ENV === 'development';

const productionProxyUrl = 'https://us-central1-data-49543.cloudfunctions.net/imageProxy'; 

const developmentProxyUrl = 'http://localhost:5001/data-49543/us-central1/imageProxy';

export const getProxiedImageUrl = (imageUrl: string): string => {
  if (!imageUrl) {
    return 'https://via.placeholder.com/150'; 
  }

  // Check if the URL is already a proxied URL or a placeholder
  if (imageUrl.includes('cloudfunctions.net/imageProxy') || imageUrl.includes('placeholder.com')) {
    return imageUrl;
  }

  // Also, don't proxy local assets or base64 encoded images
  if (imageUrl.startsWith('/') || imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  const proxyUrl = isDevelopment ? developmentProxyUrl : productionProxyUrl;
  return `${proxyUrl}?url=${encodeURIComponent(imageUrl)}`;
};
