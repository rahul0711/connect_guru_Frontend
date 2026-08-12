import api from '@/lib/axios';
import { Category, Business, resolveBusinessImageUrl, resolveBusinessCategoryName, resolveBusinessId } from '@/services/admin';

export type PublicCategoriesResponse = {
  success: boolean;
  message?: string;
  data: Category[];
};

export type PublicBusinessesResponse = {
  success: boolean;
  message?: string;
  data: Business[];
};

export type PublicBusinessSingleResponse = {
  success: boolean;
  message?: string;
  data: Business;
};

export type Demand = {
  demandId?: number;
  id?: number;
  userId?: number;
  categoryId?: number;
  title: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  status: string;
  category?: Category;
  createdAt?: string;
  updatedAt?: string;
  userName?: string;
  userCity?: string;
  inquiriesCount?: number;
};

export type CreateDemandPayload = {
  categoryId: number;
  title: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
};

export type UpdateDemandPayload = {
  title?: string;
  description?: string;
  categoryId?: number;
};

export type DemandSingleResponse = {
  success: boolean;
  message?: string;
  data: Demand;
};

export type DemandListResponse = {
  success: boolean;
  message?: string;
  data: Demand[];
};

/** Get all public active categories */
export async function getPublicCategories(): Promise<PublicCategoriesResponse> {
  const res = await api.get<PublicCategoriesResponse>('/categories');
  return res.data;
}

/** Get all public approved businesses */
export async function getPublicBusinesses(): Promise<PublicBusinessesResponse> {
  const res = await api.get<PublicBusinessesResponse>('/businesses');
  return res.data;
}

/** Get public business details by ID (Endpoint: GET /businesses/{id}) */
export async function getPublicBusinessDetail(id: number): Promise<PublicBusinessSingleResponse> {
  const res = await api.get<PublicBusinessSingleResponse>(`/businesses/${id}`);
  return res.data;
}

/** Create a new demand (Endpoint: POST /Demands) */
export async function createDemand(payload: CreateDemandPayload): Promise<DemandSingleResponse> {
  const defaultPayload = {
    address: 'Vapi Main Road',
    city: 'Vapi',
    state: 'Gujarat',
    country: 'India',
    pincode: '396191',
    latitude: 20.3893,
    longitude: 72.9106,
    ...payload,
  };
  const res = await api.post<DemandSingleResponse>('/Demands', defaultPayload);
  return res.data;
}

/** Get the logged-in user's demands (Endpoint: GET /Demands/my) */
export async function getMyDemands(): Promise<DemandListResponse> {
  const res = await api.get<DemandListResponse>('/Demands/my');
  return res.data;
}

/** Get demand details by ID (Endpoint: GET /Demands/{id}) */
export async function getDemandById(id: number): Promise<DemandSingleResponse> {
  const res = await api.get<DemandSingleResponse>(`/Demands/${id}`);
  return res.data;
}

/** Update a demand (Endpoint: PUT /Demands/{id}) */
export async function updateDemand(id: number, payload: UpdateDemandPayload): Promise<DemandSingleResponse> {
  const res = await api.put<DemandSingleResponse>(`/Demands/${id}`, payload);
  return res.data;
}

/** Close a demand (Endpoint: PATCH /Demands/{id}/close) */
export async function closeDemand(id: number): Promise<{ success: boolean; message?: string }> {
  const res = await api.patch<{ success: boolean; message?: string }>(`/Demands/${id}/close`);
  return res.data;
}

/** Cancel a demand (Endpoint: PATCH /Demands/{id}/cancel) */
export async function cancelDemand(id: number): Promise<{ success: boolean; message?: string }> {
  const res = await api.patch<{ success: boolean; message?: string }>(`/Demands/${id}/cancel`);
  return res.data;
}

/** Get all open demands (Endpoint: GET /Demands/open) */
export async function getOpenDemands(): Promise<DemandListResponse> {
  const res = await api.get<DemandListResponse>('/Demands/open');
  return res.data;
}

export { resolveBusinessImageUrl, resolveBusinessCategoryName, resolveBusinessId };
