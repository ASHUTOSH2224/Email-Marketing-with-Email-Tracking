import axios from 'axios';
import { API_BASE_URL } from '../config';

export interface EmailRecord {
  id: number;
  recipient_email: string;
  company_name: string | null;
  contact_person: string | null;
  sector: string | null;
  state: string | null;
  sent_at: string;
  success: boolean;
  error_message: string | null;
  attachment_name: string | null;
}

export interface EmailRecordFilters {
  start_date?: string;
  end_date?: string;
  sector?: string;
  state?: string;
}

export const getEmailRecords = async (filters?: EmailRecordFilters): Promise<EmailRecord[]> => {
  const params = new URLSearchParams();
  if (filters) {
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.sector) params.append('sector', filters.sector);
    if (filters.state) params.append('state', filters.state);
  }

  const response = await axios.get(`${API_BASE_URL}/api/email-records?${params.toString()}`);
  return response.data;
};

export const createEmailRecord = async (record: Omit<EmailRecord, 'id' | 'sent_at'>): Promise<EmailRecord> => {
  const response = await axios.post(`${API_BASE_URL}/api/email-records`, record);
  return response.data;
}; 