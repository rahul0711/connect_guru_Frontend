import api from '@/lib/axios';

// ─────────────────────────────────────────────────────────────
// CATEGORY TYPES
// ─────────────────────────────────────────────────────────────
export type Category = {
  id?: number;          // some endpoints return 'id'
  categoryId?: number;  // some endpoints return 'categoryId'
  categoryName: string;
  description?: string;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

/** Safely resolve the category's primary key regardless of field name */
export function resolveCategoryId(cat: Category): number {
  const resolved = cat.categoryId ?? cat.id;
  if (!resolved) throw new Error('Category has no valid id or categoryId');
  return resolved;
}

export type CategoriesResponse = {
  success: boolean;
  message?: string;
  data: Category[];
  totalCount?: number;
};

// ─────────────────────────────────────────────────────────────
// BUSINESS TYPES
// ─────────────────────────────────────────────────────────────
export type BusinessStatus = 'Pending' | 'Approved' | 'Rejected' | 'Suspended';

export type BusinessServiceItem = {
  serviceId: number;
  serviceName: string;
  description?: string;
  isActive: boolean;
};

export type BusinessImageItem = {
  businessImageId: number;
  imageUrl: string;
  displayOrder?: number;
};

export type Business = {
  id?: number;
  businessId?: number;
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
  status: BusinessStatus;
  rejectionReason?: string | null;
  approvedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  submittedOn?: string;
  categories?: Category[];
  services?: BusinessServiceItem[];
  images?: BusinessImageItem[];

  // Legacy / flat fallbacks:
  ownerName?: string;
  category?: string;
  imageUrl?: string;
};

export function resolveBusinessId(b: Business): number {
  const resolved = b.businessId ?? b.id;
  if (!resolved) throw new Error('Business has no valid businessId or id');
  return resolved;
}

export function resolveBusinessImageUrl(b: Business): string | undefined {
  if (b.imageUrl) {
    if (b.imageUrl.startsWith('http')) return b.imageUrl;
    return `https://demo.scriptindia.in:8054${b.imageUrl}`;
  }
  if (b.images && b.images.length > 0 && b.images[0].imageUrl) {
    const url = b.images[0].imageUrl;
    if (url.startsWith('http')) return url;
    return `https://demo.scriptindia.in:8054${url}`;
  }
  return undefined;
}

export function resolveBusinessCategoryName(b: Business): string {
  if (b.categories && b.categories.length > 0) {
    return b.categories.map(c => c.categoryName).join(', ');
  }
  if (b.category) return b.category;
  return 'General Service';
}

export type BusinessListResponse = {
  success: boolean;
  message?: string;
  data: Business[];
};

export type BusinessDetailResponse = {
  success: boolean;
  message?: string;
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
  const res = await api.patch(`/categories/${id}`, formData, {
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

/** Get all businesses (Admin endpoint: /businesses/admin/all) */
export async function getAllBusinessesAdmin(): Promise<BusinessListResponse> {
  const res = await api.get<BusinessListResponse>('/businesses/admin/all');
  return res.data;
}

/** Get pending businesses waiting for review */
export async function getPendingBusinesses(): Promise<BusinessListResponse> {
  const res = await api.get<BusinessListResponse>('/businesses/admin/pending');
  return res.data;
}

/** Get details of any business by ID */
export async function getAdminBusinessDetail(id: number): Promise<BusinessDetailResponse> {
  const res = await api.get<BusinessDetailResponse>(`/businesses/admin/${id}`);
  return res.data;
}

/** Approve business */
export async function approveBusiness(id: number): Promise<any> {
  const res = await api.patch(`/businesses/admin/${id}/approve`);
  return res.data;
}

/** Reject business with reason */
export async function rejectBusiness(id: number, rejectionReason: string): Promise<any> {
  const res = await api.patch(`/businesses/admin/${id}/reject`, { rejectionReason });
  return res.data;
}

/** Suspend business */
export async function suspendBusiness(id: number): Promise<any> {
  const res = await api.patch(`/businesses/admin/${id}/suspend`);
  return res.data;
}
