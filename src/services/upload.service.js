import cloudinary from '../integrations/cloudinary/cloudinaryClient.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export function uploadImageBuffer(buffer, folder = 'itmodern/products') {
  if (!env.cloudinary.cloudName) {
    throw new ApiError(503, 'Image upload is not configured');
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

export function deleteImage(publicId) {
  if (!publicId) return Promise.resolve();
  return cloudinary.uploader.destroy(publicId).catch(() => {});
}
