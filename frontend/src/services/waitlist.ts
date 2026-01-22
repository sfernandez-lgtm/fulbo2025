import api from './api';

export interface WaitlistResponse {
  message: string;
  alreadyExists: boolean;
  data?: {
    id: string;
    email: string;
    created_at: string;
  };
}

export interface WaitlistCountResponse {
  count: number;
}

export const joinWaitlist = async (email: string): Promise<WaitlistResponse> => {
  const response = await api.post('/waitlist', { email });
  return response.data;
};

export const getWaitlistCount = async (): Promise<WaitlistCountResponse> => {
  const response = await api.get('/waitlist/count');
  return response.data;
};
