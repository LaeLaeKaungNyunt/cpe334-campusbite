import { useEffect, useState } from 'react';
import { fetchMenuItems, type MenuItem } from './menuApi';
import { MenuItemCard } from './MenuItemCard';
import { fetchCurrentUser, readCart, saveCart } from '../orders/ordersApi';

type LoadState = 'loading' | 'error' | 'success';

interface CurrentUser {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'OPERATOR';
}

export function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [selection, setSelection] = useState<Record<string, number>>(() => readCart());
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetchCurrentUser().then((u) => setUser(u)).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    setError('');

    fetchMenuItems(controller.signal)
      .then((menuItems) => {
        setItems(menuItems.filter((item) => item.isAvailable || item.stockQuantity === 0));
        setState('success');
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(requestError instanceof Error ? requestError.message : 'We could not load the menu.');
        setState('error');
      });

    return () => controller.abort();
  }, [attempt]);

  function updateQuantity(menuItemId: string, quantity: number) {
    setSelection((current) => {
      const next = { ...current };
      if (quantity <= 0) delete next[menuItemId];
      else next[menuItemId] = quantity;
      saveCart(next);
      return next;
    });
  }

  const isOperator = user?.role === 'OPERATOR';
  const cartItemCount = Object.values(selection).reduce((sum, quantity) => sum + quantity, 0);

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <a className="brand" href="/" aria-label="CampusBite home">
            <span className="logo-badge">CB</span>
            <span>
              <span className="brand-name">CampusBite</span>
              <span className="tagline">Fresh picks for campus life</span>
            </span>
          </a>
          <nav className="order-nav" aria-label="Main navigation">
            <a className="nav-link" href="/">Home</a>
            <a className="nav-link nav-link-active" href="/menu" aria-current="page">Menu</a>
            {isOperator ? (
              <a className="nav-link" href="/operator/orders">Operator Orders</a>
            ) : (
              <>
                <a href="/cart">Review order ({cartItemCount})</a>
                <a href="/orders">My orders</a>
                {!user && <a href="/login">Sign in</a>}
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="menu-page">
        <section className="menu-intro" aria-labelledby="menu-title">
          <p className="eyebrow">Campus café · Pick up at the counter</p>
          <h1 id="menu-title">Good food, good day.</h1>
          <p>Browse today’s menu and choose what you’d like.</p>
        </section>

        {state === 'loading' && (
          <p className="menu-message" role="status" aria-live="polite">Loading menu…</p>
        )}

        {state === 'error' && (
          <section className="menu-message menu-error" role="alert">
            <h2>We couldn’t load the menu</h2>
            <p>{error} Please try again.</p>
            <button className="retry-button" type="button" onClick={() => setAttempt((value) => value + 1)}>
              Try again
            </button>
          </section>
        )}

        {state === 'success' && items.length === 0 && (
          <p className="menu-message" role="status">There are no menu items available right now. Please check back soon.</p>
        )}

        {state === 'success' && items.length > 0 && (
          <section className="menu-grid" aria-label="Available menu items">
            {items.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                quantity={selection[item.id] ?? 0}
                onQuantityChange={updateQuantity}
              />
            ))}
          </section>
        )}

        {state === 'success' && !isOperator && Object.values(selection).some((quantity) => quantity > 0) && (
          <div className="cart-summary-bar">
            <span>{cartItemCount} item(s) selected</span>
            <a className="btn btn-primary" href="/cart">Review your order</a>
          </div>
        )}
      </main>

      <footer className="site-footer">
        <span>CampusBite</span>
        <span>Made for campus, served with care.</span>
      </footer>
    </div>
  );
}
