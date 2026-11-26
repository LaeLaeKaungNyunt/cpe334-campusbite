export interface MenuMetadata {
  name: string;
  description: string | null;
  priceSatang: number;
}

export interface MenuAdminItem extends MenuMetadata {
  id: string;
  stockQuantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class MenuAdminError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

const adminMenu = '/api/v1/operator/menu-items';

async function requestMenu<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(adminMenu + path, { ...init, credentials: 'include' });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new MenuAdminError(
      response.status,
      payload?.error?.code ?? '',
      payload?.error?.message ?? 'The menu request could not be completed.',
    );
  }
  const { data } = await response.json() as { data: T };
  return data;
}

function saveMenu(path: string, method: 'POST' | 'PATCH', body: object) {
  return requestMenu<MenuAdminItem>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function fetchAdminMenu(signal?: AbortSignal) {
  return requestMenu<MenuAdminItem[]>('', { signal });
}

export function createMenuItem(fields: MenuMetadata & { stockQuantity: number }) {
  return saveMenu('', 'POST', fields);
}

export function editMenuItem(id: string, fields: MenuMetadata & { isActive: boolean }) {
  return saveMenu(`/${id}`, 'PATCH', fields);
}

export function adjustMenuStock(id: string, stockQuantity: number, expectedStockQuantity: number) {
  return saveMenu(`/${id}/stock`, 'PATCH', { stockQuantity, expectedStockQuantity });
}
