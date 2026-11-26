import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { fetchMenuItems, type MenuItem } from '../menu/menuApi';
import {
  fetchCurrentUser,
  fetchOrder,
  fetchOrders,
  cancelCustomerOrder,
  formatEstimatedReadyTime,
  formatOrderPrice,
  orderStatuses,
  readCart,
  saveCart,
  submitOrder,
  type CustomerOrder,
  type OrderFilters,
} from './ordersApi';

type User = { id: string; email: string; role: 'CUSTOMER' | 'OPERATOR' };

function PageFrame({ children }: { children: React.ReactNode }) {
  return <div className="site-shell">
    <header className="site-header"><div className="site-header-inner">
      <a className="brand" href="/" aria-label="CampusBite home"><span className="logo-badge">CB</span><span><span className="brand-name">CampusBite</span><span className="tagline">Fresh picks for campus life</span></span></a>
      <nav className="order-nav" aria-label="Main navigation"><a href="/menu">Menu</a><a href="/orders">My orders</a></nav>
    </div></header>
    <main className="order-page">{children}</main>
    <footer className="site-footer"><span>CampusBite</span><span>Made for campus, served with care.</span></footer>
  </div>;
}

function SignInNotice() {
  return <section className="order-panel"><h1>Sign in to continue</h1><p>Your cart is saved for this browser session. Sign in with a Customer account to place orders and view order history.</p><a className="btn btn-primary" href="/login">Sign in</a> <a className="order-text-link" href="/menu">Return to menu</a></section>;
}

export function CartPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>(() => readCart());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CustomerOrder | null>(null);

  useEffect(() => {
    Promise.all([fetchCurrentUser(), fetchMenuItems()]).then(([current, items]) => {
      setUser(current);
      setMenu(items);
    }).catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'Could not load your order review.'))
      .finally(() => setAuthReady(true));
  }, []);

  const lines = useMemo(() => Object.entries(cart).flatMap(([id, quantity]) => {
    const item = menu.find((candidate) => candidate.id === id);
    return item ? [{ item, quantity }] : [];
  }), [cart, menu]);
  const unavailableIds = Object.keys(cart).filter((id) => !menu.some((item) => item.id === id));
  const estimate = lines.reduce((total, line) => total + line.item.priceSatang * line.quantity, 0);

  function changeQuantity(id: string, quantity: number) {
    const next = { ...cart };
    if (quantity <= 0) delete next[id];
    else next[id] = quantity;
    setCart(next);
    saveCart(next);
  }

  async function placeOrder() {
    if (!user || user.role !== 'CUSTOMER') return;
    setBusy(true);
    setError('');
    try {
      const saved = await submitOrder(lines.map(({ item, quantity }) => ({ menuItemId: item.id, quantity })));
      setCreatedOrder(saved);
      setCart({});
      saveCart({});
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Order could not be placed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return <PageFrame><section className="order-heading"><p className="eyebrow">Review before placing</p><h1>Your order</h1><p>Prices shown here are estimates. The server confirms current prices and stock when you place the order.</p></section>
    {!authReady && <p role="status">Loading your order review…</p>}
    {error && <p className="order-error" role="alert">{error}</p>}
    {unavailableIds.length > 0 && <div className="order-error" role="alert"><p>Some selected items are no longer on the active menu. Remove them before placing your order.</p>{unavailableIds.map((id) => <button className="remove-unavailable" type="button" key={id} onClick={() => changeQuantity(id, 0)}>Remove unavailable item</button>)}</div>}
    {createdOrder ? <section className="order-panel order-success" role="status"><p className="eyebrow">Order placed</p><h2>Thanks, your order is saved.</h2><p>Order ID: <code>{createdOrder.id}</code></p><p>Confirmed total: <strong>{formatOrderPrice(createdOrder.totalSatang)}</strong></p><a className="btn btn-primary" href={`/orders/${createdOrder.id}`}>View order details</a> <a className="order-text-link" href="/menu">Back to menu</a></section>
      : authReady && !user ? <SignInNotice />
      : authReady && user?.role === 'OPERATOR' ? <section className="order-panel"><h2>Customer account required</h2><p>Ordering is available to Customer accounts.</p><a href="/menu">Return to menu</a></section>
      : authReady && <section className="order-panel">
        {lines.length === 0 ? <><p>Your cart is empty.</p><a className="btn btn-primary" href="/menu">Browse menu</a></> : <>
          <ul className="review-lines">{lines.map(({ item, quantity }) => <li key={item.id}><div><strong>{item.name}</strong><span>{formatOrderPrice(item.priceSatang)} each</span></div><div className="review-controls"><button type="button" aria-label={`Remove one ${item.name}`} onClick={() => changeQuantity(item.id, quantity - 1)}>−</button><span>{quantity}</span><button type="button" aria-label={`Add one ${item.name}`} disabled={quantity >= item.stockQuantity} onClick={() => changeQuantity(item.id, quantity + 1)}>+</button><strong>{formatOrderPrice(item.priceSatang * quantity)}</strong></div></li>)}</ul>
          <div className="review-total"><span>Estimated total</span><strong>{formatOrderPrice(estimate)}</strong></div>
          <div className="order-actions"><a className="order-text-link" href="/menu">Continue browsing</a><button className="btn btn-primary" type="button" onClick={placeOrder} disabled={busy || lines.length === 0 || unavailableIds.length > 0}>{busy ? 'Placing order…' : 'Place order'}</button></div>
        </>}
      </section>}
  </PageFrame>;
}

function OrderEstimate({ order, as: Element }: { order: CustomerOrder; as: 'small' | 'p' }) {
  if ((order.status !== 'ACCEPTED' && order.status !== 'PREPARING') || !order.estimatedReadyAt) return null;
  return <Element>Estimated ready: <time dateTime={order.estimatedReadyAt}>{formatEstimatedReadyTime(order.estimatedReadyAt)}</time></Element>;
}

function OrderCard({ order, onCancel, cancellingId }: {
  order: CustomerOrder;
  onCancel: (order: CustomerOrder) => void;
  cancellingId: string | null;
}) {
  return <li className="saved-order">
    <a href={`/orders/${order.id}`}>
      <span><strong>Order {order.id.slice(0, 8)}</strong><small>{new Date(order.createdAt).toLocaleString()}</small></span>
      <span><strong>{formatOrderPrice(order.totalSatang)}</strong><small>{order.status}</small><OrderEstimate order={order} as="small" /></span>
    </a>
    {order.status === 'PENDING' && <button type="button" className="btn btn-outline btn-sm" disabled={cancellingId !== null} onClick={() => onCancel(order)}>
      {cancellingId === order.id ? 'Cancelling…' : 'Cancel order'}
    </button>}
  </li>;
}

const fullOrderIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function CustomerOrderHistory() {
  const [status, setStatus] = useState('');
  const [orderId, setOrderId] = useState('');
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtered, setFiltered] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const appliedFilters = useRef<OrderFilters>({});
  const listRequest = useRef<AbortController>();

  const refreshOrders = useCallback(async () => {
    listRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;
    setLoading(true);
    setRequestError('');
    try {
      const results = await fetchOrders(appliedFilters.current, controller.signal);
      if (!controller.signal.aborted) setOrders(results);
    } catch (error) {
      if (!controller.signal.aborted) {
        setRequestError(error instanceof Error && !(error instanceof SyntaxError) ? error.message : 'Could not load your orders. Please try again.');
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshOrders();
    return () => listRequest.current?.abort();
  }, [refreshOrders]);

  function search(filters: OrderFilters) {
    appliedFilters.current = filters;
    setFiltered(Boolean(filters.status || filters.orderId));
    setValidationError('');
    setCancelError('');
    setOrders([]);
    void refreshOrders();
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (orderId && (orderId.length !== 36 || !fullOrderIdPattern.test(orderId))) {
      setValidationError('Enter the full order ID in UUID format. You can find it on the order details page.');
      return;
    }
    search({ status, orderId });
  }

  async function handleCancel(order: CustomerOrder) {
    if (cancellingId !== null || !window.confirm('Cancel this pending order?')) return;
    setCancellingId(order.id);
    setCancelError('');
    try {
      const result = await cancelCustomerOrder(order.id);
      const { status: activeStatus } = appliedFilters.current;
      setOrders((current) => activeStatus && activeStatus !== result.status
        ? current.filter((entry) => entry.id !== result.id)
        : current.map((entry) => entry.id === result.id ? { ...entry, status: result.status } : entry));
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : 'Could not cancel this order. Refresh and try again.');
    } finally {
      await refreshOrders();
      setCancellingId(null);
    }
  }

  return <>
    <form className="order-panel order-filters" aria-label="Filter orders" onSubmit={applyFilters}>
      <label>Status
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {orderStatuses.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label>Full order ID
        <input type="text" value={orderId} onChange={(event) => {
          setOrderId(event.target.value);
          setValidationError('');
        }} autoComplete="off" spellCheck={false} aria-invalid={Boolean(validationError)} aria-describedby={validationError ? 'order-id-error' : undefined} />
      </label>
      {validationError && <div id="order-id-error" className="order-error" role="alert">{validationError}</div>}
      <div className="order-actions">
        <button className="btn btn-outline" type="button" onClick={() => {
          setStatus('');
          setOrderId('');
          search({});
        }}>Clear</button>
        <button className="btn btn-primary" type="submit">Apply</button>
      </div>
    </form>
    {loading && <p role="status">Loading your orders…</p>}
    {requestError && <p className="order-error" role="alert">{requestError}</p>}
    {cancelError && <p className="order-error" role="alert">{cancelError}</p>}
    {orders.length > 0 && <ul className="saved-orders">{orders.map((order) => <OrderCard key={order.id} order={order} onCancel={handleCancel} cancellingId={cancellingId} />)}</ul>}
    {!loading && !requestError && orders.length === 0 && <section className="order-panel">
      {filtered ? <p role="status">No orders match your filters.</p> : <><p>You have not placed an order yet.</p><a className="btn btn-primary" href="/menu">Browse menu</a></>}
    </section>}
  </>;
}

export function OrdersPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    fetchCurrentUser().then((current) => {
      if (active) setUser(current);
    }).catch((requestError: unknown) => {
      if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load your orders.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);
  return <PageFrame><section className="order-heading"><p className="eyebrow">Your history</p><h1>My orders</h1><p>Saved orders and their current statuses.</p></section>
    {loading && <p role="status">Loading your orders…</p>}{error && <p className="order-error" role="alert">{error}</p>}
    {!loading && !error && !user && <SignInNotice />}
    {!loading && !error && user?.role === 'OPERATOR' && <section className="order-panel"><p>Order history is available to Customer accounts.</p></section>}
    {!loading && user?.role === 'CUSTOMER' && <CustomerOrderHistory />}
  </PageFrame>;
}

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState('');
  async function handleCancel() {
    if (cancelling || !order || order.status !== 'PENDING' || !window.confirm('Cancel this pending order?')) return;
    setCancelling(true);
    setError('');
    setNotice('');
    try {
      const result = await cancelCustomerOrder(order.id);
      setOrder({ ...order, status: result.status });
      setNotice('Order cancelled.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not cancel this order. Refresh and try again.');
    } finally {
      try {
        setOrder(await fetchOrder(order.id));
      } catch {
        setError((current) => current || 'Could not refresh this order.');
      }
      setCancelling(false);
    }
  }
  useEffect(() => {
    fetchOrder(orderId).then(setOrder).catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'Could not load this order.'))
      .finally(() => setLoading(false));
  }, [orderId]);
  return <PageFrame><section className="order-heading"><p className="eyebrow">Saved order</p><h1>Order details</h1></section>
    {loading && <p role="status">Loading order…</p>}{error && <section className="order-panel"><p className="order-error" role="alert">{error}</p>{!order && <><p>This order may not exist or may belong to another Customer.</p><a href="/orders">Back to my orders</a></>}</section>}
    {order && <section className="order-panel">
      <p>Status: <strong>{order.status}</strong></p>
      {order.status === 'PENDING' && <button type="button" className="btn btn-outline" disabled={cancelling} onClick={handleCancel}>{cancelling ? 'Cancelling…' : 'Cancel order'}</button>}
      {notice && <p role="status">{notice}</p>}
      <OrderEstimate order={order} as="p" />
      <p>Payment: <strong>{order.paymentStatus}</strong></p><ul className="review-lines">{order.items.map((item) => <li key={item.id}><div><strong>{item.menuItem?.name || 'Menu item'}</strong><span>{item.quantity} × {formatOrderPrice(item.unitPriceSatang)}</span></div><strong>{formatOrderPrice(item.lineTotalSatang)}</strong></li>)}</ul><div className="review-total"><span>Saved total</span><strong>{formatOrderPrice(order.totalSatang)}</strong></div><p className="order-muted">Order ID: <code>{order.id}</code></p><a href="/orders">Back to my orders</a>
    </section>}
  </PageFrame>;
}
