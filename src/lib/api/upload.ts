import { request } from '@/lib/api/request';

export const uploadApi = {
  uploadFile: (file: File, type?: 'logo' | 'banner') => {
    const formData = new FormData();
    formData.append('file', file);
    if (type) {
      formData.set('type', type);
    }

    return request<{ url?: string }>('/api/upload', {
      method: 'POST',
      body: formData,
    });
  },
};
