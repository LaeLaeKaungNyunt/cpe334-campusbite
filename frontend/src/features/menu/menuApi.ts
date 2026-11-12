export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  priceSatang: number;
  stockQuantity: number;
  isAvailable: boolean;
}

interface MenuResponse {
  data: MenuItem[];
}

export async function fetchMenuItems(signal?: AbortSignal): Promise<MenuItem[]> {
  const response = await fetch('/api/v1/menu-items', { signal });
  if (!response.ok) {
    throw new Error(`Menu request failed (HTTP ${response.status}).`);
  }

  const result = (await response.json()) as MenuResponse;
  if (!result || !Array.isArray(result.data)) {
    throw new Error('The menu response was not in the expected format.');
  }

  return result.data;
}

export function formatPriceSatang(priceSatang: number): string {
  return `฿${(priceSatang / 100).toFixed(2)}`;
}
