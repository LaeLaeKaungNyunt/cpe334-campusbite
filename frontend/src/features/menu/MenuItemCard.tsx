import type { MenuItem } from './menuApi';
import { formatPriceSatang } from './menuApi';

interface MenuItemCardProps {
  item: MenuItem;
  quantity: number;
  onQuantityChange: (menuItemId: string, quantity: number) => void;
}

export function MenuItemCard({ item, quantity, onQuantityChange }: MenuItemCardProps) {
  const soldOut = !item.isAvailable || item.stockQuantity === 0;

  return (
    <article className="menu-item-card">
      <div className="menu-item-content">
        <div className="menu-item-heading">
          <h2>{item.name}</h2>
          {soldOut && <span className="sold-out-badge">Sold Out</span>}
        </div>
        <p className="menu-item-description">{item.description || 'Made fresh at CampusBite.'}</p>
        <p className="menu-item-price">{formatPriceSatang(item.priceSatang)}</p>
      </div>

      {soldOut ? (
        <button className="quantity-button quantity-button-disabled" type="button" disabled>
          Sold Out
        </button>
      ) : (
        <div className="quantity-control" aria-label={`Selection for ${item.name}`}>
          <button
            className="quantity-button"
            type="button"
            aria-label={`Remove one ${item.name}`}
            disabled={quantity === 0}
            onClick={() => onQuantityChange(item.id, quantity - 1)}
          >
            −
          </button>
          <output aria-label={`${item.name} quantity`}>{quantity}</output>
          <button
            className="quantity-button"
            type="button"
            aria-label={`Add one ${item.name}`}
            disabled={quantity >= item.stockQuantity}
            onClick={() => onQuantityChange(item.id, quantity + 1)}
          >
            +
          </button>
        </div>
      )}
    </article>
  );
}
