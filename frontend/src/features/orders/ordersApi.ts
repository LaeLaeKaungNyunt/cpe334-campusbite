export interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  unitPriceSatang: number;
  lineTotalSatang: number;
  menuItem?: { name: string };
}

export interface CustomerOrder {
  id: string;
  status: string;
  paymentStatus: string;
  totalSatang: number;
  createdAt: string;
  items: OrderItem[];
}

interface ApiError {
  error?: { code?: string; message?: string };
}

async function readResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & ApiError;
  if (!response.ok) {
    throw new Error(body.error?.message || `Request failed (HTTP ${response.status}).`);
  }
  return body;
}

export async function fetchCurrentUser() {
  const response = await fetch('/api/v1/auth/me', { credentials: 'include' });
  if (response.status === 401) return null;
  const result = await readResponse<{ data: { id: string; email: string; role: 'CUSTOMER' | 'OPERATOR' } }>(response);
  return result.data;
}

export async function submitOrder(items: Array<{ menuItemId: string; quantity: number }>) {
  const response = await fetch('/api/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ items }),
  });
  const result = await readResponse<{ data: CustomerOrder }>(response);
  return result.data;
}

export async function fetchOrders() {
  const response = await fetch('/api/v1/orders', { credentials: 'include' });
  const result = await readResponse<{ data: CustomerOrder[] }>(response);
  return result.data;
}

export async function fetchOrder(id: string) {
  const response = await fetch(`/api/v1/orders/${encodeURIComponent(id)}`, { credentials: 'include' });
  const result = await readResponse<{ data: CustomerOrder }>(response);
  return result.data;
}

export function readCart(): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem('campusbite-cart') || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, quantity]) => Number.isInteger(quantity) && (quantity as number) > 0)) as Record<string, number>;
  } catch {
    return {};
  }
}

export function saveCart(cart: Record<string, number>) {
  sessionStorage.setItem('campusbite-cart', JSON.stringify(cart));
}

export function formatOrderPrice(satang: number) {
  return `฿${(satang / 100).toFixed(2)}`;
}
