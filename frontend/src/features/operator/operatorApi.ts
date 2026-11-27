export interface OrderItemSummary {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  unitPriceSatang: number;
  lineTotalSatang: number;
  menuItem?: {
    id: string;
    name: string;
  };
}

export interface OperatorOrder {
  id: string;
  customerId: string;
  status: 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PAID_SIMULATED';
  totalSatang: number;
  estimatedReadyAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    email: string;
  };
  items: OrderItemSummary[];
}

export interface AcceptOrderResult {
  id: string;
  status: 'ACCEPTED';
  estimatedReadyAt: string;
  updatedAt: string;
}

export interface OrderMutationResult {
  id: string;
  status: OperatorOrder['status'];
  estimatedReadyAt: string | null;
  updatedAt: string;
}

export class OperatorOrderError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function patchOrder<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'PATCH',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new OperatorOrderError(response.status, result?.error?.message || `Order update failed (HTTP ${response.status}).`);
  }
  return result.data as T;
}

export async function fetchOperatorOrders(signal?: AbortSignal): Promise<OperatorOrder[]> {
  const response = await fetch('/api/v1/operator/orders', {
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error?.message || `Failed to fetch orders (HTTP ${response.status})`);
  }

  const json = await response.json();
  return json.data;
}

export async function acceptOperatorOrder(orderId: string, estimatedPrepMinutes: number): Promise<AcceptOrderResult> {
  const response = await fetch(`/api/v1/operator/orders/${orderId}/accept`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ estimatedPrepMinutes }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error?.message || `Failed to accept order (HTTP ${response.status})`);
  }

  const json = await response.json();
  return json.data;
}

export async function cancelOperatorOrder(orderId: string): Promise<{ id: string; status: 'CANCELLED'; updatedAt: string }> {
  return patchOrder(`/api/v1/operator/orders/${encodeURIComponent(orderId)}/cancel`);
}

export async function updateOperatorOrderStatus(orderId: string, status: 'PREPARING' | 'READY' | 'COMPLETED'): Promise<OrderMutationResult> {
  return patchOrder(`/api/v1/operator/orders/${encodeURIComponent(orderId)}/status`, { status });
}

export function recordSimulatedPayment(orderId: string): Promise<{ id: string; paymentStatus: 'PAID_SIMULATED'; updatedAt: string }> {
  return patchOrder(`/api/v1/operator/orders/${encodeURIComponent(orderId)}/payment`, { paymentStatus: 'PAID_SIMULATED' });
}
