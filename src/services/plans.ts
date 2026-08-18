import api from '@/lib/axios';

// ─────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────

export type PlanFeature = {
  planFeatureId: number;
  planId?: number;
  featureName: string;
  featureValue?: string | null;
  createdAt?: string;
};

export type Plan = {
  planId: number;
  planName: string;
  price: number;
  durationInDays: number;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  features?: PlanFeature[];
};

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export type CreatePlanPayload = {
  planName: string;
  price: number;
  durationInDays: number;
  description?: string;
};

export type UpdatePlanPayload = {
  planName?: string;
  price?: number;
  durationInDays?: number;
  description?: string;
};

export type AddFeaturePayload = {
  featureName: string;
  featureValue?: string | null;
};

export type UpdateFeaturePayload = {
  featureName: string;
  featureValue?: string | null;
};

// ─────────────────────────────────────────────────────────────
// HELPER: ERROR MESSAGE PARSER
// ─────────────────────────────────────────────────────────────

export function extractPlanErrorMessage(error: any, defaultMsg = 'An unexpected error occurred.'): string {
  if (!error) return defaultMsg;
  const data = error?.response?.data;

  if (typeof data === 'string' && data.trim()) return data;

  if (data?.errors && typeof data.errors === 'object') {
    const msgs: string[] = [];
    for (const key in data.errors) {
      if (Array.isArray(data.errors[key])) msgs.push(...data.errors[key]);
      else if (typeof data.errors[key] === 'string') msgs.push(data.errors[key]);
    }
    if (msgs.length > 0) return msgs.join('\n');
  }

  if (data?.message) return data.message;
  if (error.message) return error.message;
  return defaultMsg;
}

// ─────────────────────────────────────────────────────────────
// HELPER: Extract originalPrice from a plan's OriginalPrice feature
// ─────────────────────────────────────────────────────────────
export function getOriginalPrice(plan: Plan): number | null {
  const feat = plan.features?.find(
    f => f.featureName.toLowerCase() === 'originalprice',
  );
  if (feat?.featureValue) {
    const parsed = parseFloat(feat.featureValue);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

/** Returns visible features — strips the internal OriginalPrice meta-feature */
export function getDisplayFeatures(plan: Plan): PlanFeature[] {
  return (plan.features ?? []).filter(
    f => f.featureName.toLowerCase() !== 'originalprice',
  );
}

// ─────────────────────────────────────────────────────────────
// PLAN API ENDPOINTS
// ─────────────────────────────────────────────────────────────

/** 1. GET /api/plans  — Business & Admin */
export async function getActivePlans(): Promise<ApiResponse<Plan[]>> {
  const res = await api.get<ApiResponse<Plan[]>>('/plans');
  return res.data;
}

/** 2. GET /api/plans/{id}  — Business & Admin */
export async function getPlanById(id: number): Promise<ApiResponse<Plan>> {
  const res = await api.get<ApiResponse<Plan>>(`/plans/${id}`);
  return res.data;
}

/** 3. POST /api/plans  — Admin */
export async function createPlan(payload: CreatePlanPayload): Promise<ApiResponse<{ planId: number }>> {
  const res = await api.post<ApiResponse<{ planId: number }>>('/plans', payload);
  return res.data;
}

/** 4. PUT /api/plans/{id}  — Admin */
export async function updatePlan(id: number, payload: UpdatePlanPayload): Promise<ApiResponse<any>> {
  const res = await api.patch<ApiResponse<any>>(`/plans/${id}`, payload);
  return res.data;
}

/** 5. PATCH /api/plans/{id}/status  — Admin */
export async function setPlanStatus(id: number, isActive: boolean): Promise<ApiResponse<any>> {
  const res = await api.patch<ApiResponse<any>>(`/plans/${id}/status`, { isActive });
  return res.data;
}

/** 6. POST /api/plans/{id}/features  — Admin */
export async function addPlanFeature(
  planId: number,
  payload: AddFeaturePayload,
): Promise<ApiResponse<{ planFeatureId: number }>> {
  const res = await api.post<ApiResponse<{ planFeatureId: number }>>(`/plans/${planId}/features`, payload);
  return res.data;
}

/** 7. PUT /api/plans/features/{featureId}  — Admin */
export async function updatePlanFeature(
  featureId: number,
  payload: UpdateFeaturePayload,
): Promise<ApiResponse<any>> {
  const res = await api.patch<ApiResponse<any>>(`/plans/features/${featureId}`, payload);
  return res.data;
}

/** 8. DELETE /api/plans/features/{featureId}  — Admin */
export async function deletePlanFeature(featureId: number): Promise<ApiResponse<any>> {
  const res = await api.delete<ApiResponse<any>>(`/plans/features/${featureId}`);
  return res.data;
}
