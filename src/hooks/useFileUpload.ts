import { useState } from 'react';
import { storageUtils } from '../utils/firebaseUtils';

interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
  url: string | null;
}

export const useFileUpload = () => {
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    url: null
  });

  const uploadFile = async (
    file: File, 
    path: string,
    onProgress?: (progress: number) => void
  ): Promise<string> => {
    setUploadState({
      uploading: true,
      progress: 0,
      error: null,
      url: null
    });

    try {
      // Validate file size (1MB limit)
      const maxSize = 1024 * 1024; // 1MB
      if (file.size > maxSize) {
        throw new Error('File size must be less than 1MB');
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Only JPEG, PNG, and GIF files are allowed');
      }

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
        if (onProgress) {
          onProgress(Math.min(uploadState.progress + 10, 90));
        }
      }, 100);

      const downloadURL = await storageUtils.uploadFile(file, path);

      clearInterval(progressInterval);

      setUploadState({
        uploading: false,
        progress: 100,
        error: null,
        url: downloadURL
      });

      return downloadURL;
    } catch (error: any) {
      setUploadState({
        uploading: false,
        progress: 0,
        error: error.message || 'Upload failed',
        url: null
      });
      throw error;
    }
  };

  const resetUploadState = () => {
    setUploadState({
      uploading: false,
      progress: 0,
      error: null,
      url: null
    });
  };

  return {
    uploadState,
    uploadFile,
    resetUploadState
  };
};
