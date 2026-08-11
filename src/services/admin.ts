import api from '@/lib/axios';

// ─────────────────────────────────────────────────────────────
// CATEGORY TYPES
// ─────────────────────────────────────────────────────────────
export type Category = {
  id?: number;          // some endpoints return 'id'
  categoryId?: number;  // some endpoints return 'categoryId'
  categoryName: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
};

/** Safely resolve the category's primary key regardless of field name */
export function resolveCategoryId(cat: Category): number {
  const resolved = cat.categoryId ?? cat.id;
  if (!resolved) throw new Error('Category has no valid id or categoryId');
  return resolved;
}

export type CategoriesResponse = {
  success: boolean;
  data: Category[];
  totalCount?: number;
};

// ─────────────────────────────────────────────────────────────
// BUSINESS TYPES
// ─────────────────────────────────────────────────────────────
export type BusinessStatus = 'Pending' | 'Approved' | 'Rejected' | 'Suspended';

export type Business = {
  id: number;
  businessName: string;
  ownerName?: string;
  phoneNumber?: string;
  email?: string;
  category?: string;
  description?: string;
  city?: string;
  state?: string;
  status: BusinessStatus;
  submittedOn?: string;
  imageUrl?: string;
};

export type BusinessListResponse = {
  success: boolean;
  data: Business[];
};

export type BusinessDetailResponse = {
  success: boolean;
  data: Business;
};

// ─────────────────────────────────────────────────────────────
// CATEGORY APIs
// ─────────────────────────────────────────────────────────────
export async function getCategories(): Promise<CategoriesResponse> {
  const res = await api.get<CategoriesResponse>('/categories');
  return res.data;
}

export async function createCategory(formData: FormData): Promise<any> {
  const res = await api.post('/categories', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function updateCategory(id: number, formData: FormData): Promise<any> {
  const res = await api.put(`/categories/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function setCategoryStatus(id: number, isActive: boolean): Promise<any> {
  const res = await api.patch(`/categories/${id}/status`, { isActive });
  return res.data;
}

export async function deleteCategory(id: number): Promise<any> {
  const res = await api.delete(`/categories/${id}`);
  return res.data;
}

// ─────────────────────────────────────────────────────────────
// BUSINESS APIs (Admin)
// ─────────────────────────────────────────────────────────────
export async function getPendingBusinesses(): Promise<BusinessListResponse> {
  const res = await api.get<BusinessListResponse>('/businesses/admin/pending');
  return res.data;
}

export async function getAdminBusinessDetail(id: number): Promise<BusinessDetailResponse> {
  const res = await api.get<BusinessDetailResponse>(`/businesses/admin/${id}`);
  return res.data;
}

export async function approveBusiness(id: number): Promise<any> {
  const res = await api.patch(`/businesses/admin/${id}/approve`);
  return res.data;
}

export async function rejectBusiness(id: number, rejectionReason: string): Promise<any> {
  const res = await api.patch(`/businesses/admin/${id}/reject`, { rejectionReason });
  return res.data;
}

export async function suspendBusiness(id: number): Promise<any> {
  const res = await api.patch(`/businesses/admin/${id}/suspend`);
  return res.data;
}
