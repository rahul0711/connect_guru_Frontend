import api from '@/lib/axios';

// ─────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────

export type MyBusinessCategory = {
  categoryId: number;
  categoryName: string;
  description?: string;
  imageUrl?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type MyBusinessService = {
  serviceId?: number;
  serviceName: string;
  description?: string | null;
  price?: number;
  isActive?: boolean;
};

export type MyBusinessImage = {
  businessImageId: number;
  imageUrl: string;
  displayOrder?: number;
};

export type MyBusinessDetail = {
  businessId: number;
  ownerUserId?: number;
  businessName: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  status: 'Approved' | 'Pending' | 'Rejected' | 'None' | string;
  rejectionReason?: string | null;
  approvedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  categories: MyBusinessCategory[];
  services: MyBusinessService[];
  images: MyBusinessImage[];
};

export type GetMyBusinessResponse = {
  success: boolean;
  message?: string;
  data: MyBusinessDetail;
};

export type UpdateBusinessResponse = {
  success: boolean;
  message?: string;
  data?: any;
};

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

// ─────────────────────────────────────────────────────────────
// BUSINESS API METHODS
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/Businesses/my
 * Fetches current authenticated user's business profile with categories, services, and images.
 * Returns null on 404 (if not created yet).
 */
export async function getMyBusiness(): Promise<MyBusinessDetail | null> {
  try {
    const res = await api.get<GetMyBusinessResponse>('/Businesses/my');
    return res.data?.data ?? null;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * PATCH /api/Businesses/my
 * Updates business details using multipart/form-data.
 */
export async function updateMyBusiness(formData: FormData): Promise<UpdateBusinessResponse> {
  const res = await api.patch<UpdateBusinessResponse>('/Businesses/my', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

/**
 * POST /api/Businesses
 * Business creates listing (form-data)
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
 * GET /api/DemandResponses/business/open-demands
 * Returns open demands for business with detailsLocked flag based on tier.
 */
export async function getBusinessOpenDemands(): Promise<{ success: boolean; message?: string; data: any[] }> {
  const res = await api.get<{ success: boolean; message?: string; data: any[] }>('/DemandResponses/business/open-demands');
  return res.data;
}

/**
 * GET /api/DemandResponses/business/demands/{demandId}
 * Returns demand details with detailsLocked flag based on tier.
 */
export async function getBusinessDemandDetail(demandId: number): Promise<{ success: boolean; message?: string; data: any }> {
  const res = await api.get<{ success: boolean; message?: string; data: any }>(`/DemandResponses/business/demands/${demandId}`);
  return res.data;
}

/**
 * POST /api/DemandResponses/business/respond
 * Business responds to a customer demand
 */
export async function respondToDemand(demandId: number, message: string): Promise<RespondToDemandResponse> {
  const res = await api.post<RespondToDemandResponse>('/DemandResponses/business/respond', {
    demandId,
    message,
  });
  return res.data;
}

/**
 * GET /api/DemandResponses/user/demand/{demandId}
 * User checks responses received for their demand
 */
export async function getDemandResponsesForUser(demandId: number): Promise<DemandResponsesListResponse> {
  const res = await api.get<DemandResponsesListResponse>(`/DemandResponses/user/demand/${demandId}`);
  return res.data;
}

/**
 * PATCH /api/DemandResponses/user/{responseId}/accept
 * User accepts a business response
 */
export async function acceptDemandResponse(responseId: number): Promise<{ success: boolean; message?: string }> {
  const res = await api.patch<{ success: boolean; message?: string }>(`/DemandResponses/user/${responseId}/accept`);
  return res.data;
}
