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
  paymentStatus: string;
  totalSatang: number;
  updatedAt: string;
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

export async function acceptOperatorOrder(orderId: string): Promise<AcceptOrderResult> {
  const response = await fetch(`/api/v1/operator/orders/${orderId}/accept`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error?.message || `Failed to accept order (HTTP ${response.status})`);
  }

  const json = await response.json();
  return json.data;
}
