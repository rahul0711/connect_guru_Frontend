import api from '@/lib/axios';
import { Business } from '@/services/admin';

export type CreateBusinessResponse = {
  success: boolean;
  message?: string;
  data?: {
    businessId: number;
  };
};

export type DemandResponseItem = {
  responseId: number;
  demandId?: number;
  message?: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  createdAt?: string;
  business?: {
    businessId?: number;
    businessName: string;
    email?: string;
    phoneNumber?: string;
    city?: string;
    description?: string;
  };
};

export type DemandResponsesListResponse = {
  success: boolean;
  message?: string;
  data: DemandResponseItem[];
};

export type RespondToDemandResponse = {
  success: boolean;
  message?: string;
  data?: {
    responseId: number;
  };
};

/**
 * Step 1 — Business creates listing (form-data)
 * POST /api/Businesses
 */
export async function createBusinessListing(formData: FormData): Promise<CreateBusinessResponse> {
  const res = await api.post<CreateBusinessResponse>('/Businesses', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

/**
 * Step 1 — Business responds to a customer demand
 * POST /api/DemandResponses/business/respond
 */
export async function respondToDemand(demandId: number, message: string): Promise<RespondToDemandResponse> {
  const res = await api.post<RespondToDemandResponse>('/DemandResponses/business/respond', {
    demandId,
    message,
  });
  return res.data;
}

/**
 * Step 2 — User checks responses received for their demand
 * GET /api/DemandResponses/user/demand/{demandId}
 */
export async function getDemandResponsesForUser(demandId: number): Promise<DemandResponsesListResponse> {
  const res = await api.get<DemandResponsesListResponse>(`/DemandResponses/user/demand/${demandId}`);
  return res.data;
}

/**
 * Step 3 — User accepts a business response
 * PATCH /api/DemandResponses/user/{responseId}/accept
 */
export async function acceptDemandResponse(responseId: number): Promise<{ success: boolean; message?: string }> {
  const res = await api.patch<{ success: boolean; message?: string }>(`/DemandResponses/user/${responseId}/accept`);
  return res.data;
}
