import { useEffect, useState, useCallback } from 'react';
import {
  fetchOperatorOrders,
  acceptOperatorOrder,
  type OperatorOrder,
} from './operatorApi';

interface AuthUser {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'OPERATOR';
}

export function OperatorOrdersPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const [orders, setOrders] = useState<OperatorOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  // Check current session
  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      try {
        const response = await fetch('/api/v1/auth/me', { credentials: 'include' });
        if (response.ok) {
          const result = await response.json();
          if (isMounted && result.data) {
            setCurrentUser(result.data);
          }
        } else {
          if (isMounted) setCurrentUser(null);
        }
      } catch {
        if (isMounted) setCurrentUser(null);
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    }
    checkSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOperatorOrders();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch orders once authenticated as OPERATOR
  useEffect(() => {
    if (!authLoading && currentUser?.role === 'OPERATOR') {
      loadOrders();
    }
  }, [authLoading, currentUser, loadOrders]);

  async function handleAccept(orderId: string) {
    setAcceptingId(orderId);
    setConfirmationMessage(null);
    setError(null);

    try {
      const result = await acceptOperatorOrder(orderId);
      // Update local state with the server-returned status
      setOrders((prev) =>
        prev.map((order) =>
          order.id === result.id ? { ...order, status: result.status } : order,
        ),
      );
      setConfirmationMessage(`Order #${orderId.slice(0, 8)} accepted successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept order.');
    } finally {
      setAcceptingId(null);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      window.location.href = '/';
    }
  }

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const acceptedCount = orders.filter((o) => o.status === 'ACCEPTED').length;

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <a className="brand" href="/" aria-label="CampusBite home">
            <span className="logo-badge">CB</span>
            <span>
              <span className="brand-name">CampusBite</span>
              <span className="tagline">Staff Operations Portal</span>
            </span>
          </a>
          <nav aria-label="Main navigation" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <a className="nav-link" href="/menu">
              Menu
            </a>
            <a className="nav-link nav-link-active" href="/operator/orders" aria-current="page">
              Operator Orders
            </a>
            {currentUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
                <span className="user-badge">
                  <span>{currentUser.email}</span>
                  <span className="role-badge role-operator">OPERATOR</span>
                </span>
                <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>
                  Sign Out
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="menu-page" style={{ maxWidth: '960px' }}>
        <section className="menu-intro" aria-labelledby="operator-title" style={{ marginBottom: '1.5rem' }}>
          <p className="eyebrow">Café Operations · Sprint 1</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 id="operator-title" style={{ fontSize: '1.75rem', color: '#2d3748' }}>
                Operator Order Management
              </h1>
              <p style={{ color: '#718096', marginTop: '0.25rem' }}>
                Incoming orders for the campus café. Inspect line items and accept pending orders.
              </p>
            </div>
            {currentUser?.role === 'OPERATOR' && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={loadOrders}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : '↻ Refresh Orders'}
              </button>
            )}
          </div>
        </section>

        {/* Auth checking state */}
        {authLoading && (
          <p className="menu-message" role="status">
            Checking operator session…
          </p>
        )}

        {/* Anonymous state */}
        {!authLoading && !currentUser && (
          <section className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <h2 className="card-title">Sign In Required</h2>
            <p style={{ color: '#4a5568', marginBottom: '1.25rem' }}>
              You must be signed in with an authorized Operator account to access café order management.
            </p>
            <a href="/login" className="btn btn-primary">
              Sign In to CampusBite
            </a>
          </section>
        )}

        {/* Forbidden CUSTOMER state */}
        {!authLoading && currentUser && currentUser.role !== 'OPERATOR' && (
          <section className="card" style={{ borderLeft: '4px solid #e53e3e', padding: '2rem' }}>
            <h2 className="card-title" style={{ color: '#c53030' }}>
              Access Forbidden (HTTP 403)
            </h2>
            <p style={{ color: '#4a5568', marginBottom: '1rem' }}>
              Your account (<strong>{currentUser.email}</strong>) has the <strong>CUSTOMER</strong> role.
              Order management is restricted exclusively to café staff operators.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <a href="/menu" className="btn btn-primary">
                Browse Customer Menu
              </a>
              <button type="button" className="btn btn-outline" onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          </section>
        )}

        {/* OPERATOR Authenticated View */}
        {!authLoading && currentUser?.role === 'OPERATOR' && (
          <>
            {/* Feedback Banners */}
            {confirmationMessage && (
              <div
                style={{
                  backgroundColor: '#def7ec',
                  border: '1px solid #31c48d',
                  color: '#03543f',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.9rem',
                }}
                role="status"
              >
                ✓ {confirmationMessage}
              </div>
            )}

            {error && (
              <div className="form-error" style={{ marginBottom: '1rem' }} role="alert">
                ⚠ {error}
              </div>
            )}

            {/* Metrics Counters */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div className="card" style={{ margin: 0, padding: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#718096', textTransform: 'uppercase', fontWeight: 600 }}>
                  Total Orders
                </span>
                <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#2d3748', margin: '0.25rem 0 0' }}>
                  {orders.length}
                </p>
              </div>

              <div className="card" style={{ margin: 0, padding: '1rem', borderLeft: '4px solid #dd6b20' }}>
                <span style={{ fontSize: '0.8rem', color: '#dd6b20', textTransform: 'uppercase', fontWeight: 600 }}>
                  Pending Acceptance
                </span>
                <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#c05621', margin: '0.25rem 0 0' }}>
                  {pendingCount}
                </p>
              </div>

              <div className="card" style={{ margin: 0, padding: '1rem', borderLeft: '4px solid #319795' }}>
                <span style={{ fontSize: '0.8rem', color: '#319795', textTransform: 'uppercase', fontWeight: 600 }}>
                  Accepted
                </span>
                <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#234e52', margin: '0.25rem 0 0' }}>
                  {acceptedCount}
                </p>
              </div>
            </div>

            {/* Orders Feed */}
            {loading && orders.length === 0 ? (
              <p className="menu-message" role="status">
                Loading incoming café orders…
              </p>
            ) : orders.length === 0 ? (
              <section className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <h2 className="card-title" style={{ color: '#4a5568' }}>
                  No Orders Placed Yet
                </h2>
                <p style={{ color: '#718096' }}>
                  When campus customers submit orders, they will appear here in real time for operator acceptance.
                </p>
              </section>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orders.map((order) => {
                  const isPending = order.status === 'PENDING';
                  const isAccepted = order.status === 'ACCEPTED';
                  const isSubmitting = acceptingId === order.id;

                  return (
                    <article
                      key={order.id}
                      className="card"
                      style={{
                        margin: 0,
                        borderLeft: isPending ? '4px solid #dd6b20' : isAccepted ? '4px solid #319795' : '4px solid #cbd5e0',
                      }}
                    >
                      {/* Order Header */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          flexWrap: 'wrap',
                          gap: '0.75rem',
                          borderBottom: '1px solid #edf2f7',
                          paddingBottom: '0.75rem',
                          marginBottom: '0.75rem',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, color: '#2d3748', fontSize: '1.05rem' }}>
                              Order #{order.id.slice(0, 8)}
                            </span>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '4px',
                                backgroundColor: isPending ? '#feebc8' : isAccepted ? '#c6f6d5' : '#edf2f7',
                                color: isPending ? '#7b341e' : isAccepted ? '#22543d' : '#4a5568',
                              }}
                            >
                              {order.status}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.825rem', color: '#718096', marginTop: '0.2rem' }}>
                            Customer: <strong>{order.customer?.email ?? order.customerId}</strong> ·{' '}
                            {new Date(order.createdAt).toLocaleString()}
                          </p>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase' }}>
                            Total Due
                          </span>
                          <p style={{ fontSize: '1.25rem', fontWeight: 750, color: '#2d3748' }}>
                            ฿{(order.totalSatang / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Line Items List */}
                      <div style={{ marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#718096', textTransform: 'uppercase' }}>
                          Items ({order.items.length})
                        </span>
                        <ul style={{ listStyle: 'none', padding: 0, marginTop: '0.35rem' }}>
                          {order.items.map((item) => (
                            <li
                              key={item.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.9rem',
                                padding: '0.25rem 0',
                                color: '#4a5568',
                              }}
                            >
                              <span>
                                <strong>{item.quantity}×</strong> {item.menuItem?.name ?? item.menuItemId}
                              </span>
                              <span>฿{(item.lineTotalSatang / 100).toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Action Bar */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          gap: '0.75rem',
                          borderTop: '1px solid #edf2f7',
                          paddingTop: '0.75rem',
                        }}
                      >
                        {isPending && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleAccept(order.id)}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? 'Accepting…' : 'Accept Order'}
                          </button>
                        )}
                        {isAccepted && (
                          <span style={{ color: '#276749', fontSize: '0.85rem', fontWeight: 600 }}>
                            ✓ Accepted &amp; In Kitchen
                          </span>
                        )}
                        {!isPending && !isAccepted && (
                          <span style={{ color: '#718096', fontSize: '0.85rem' }}>
                            Status: {order.status}
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="site-footer">
        <span>CampusBite · Staff Operations</span>
        <span>Theme 4 — Campus Food Pre-Ordering and Pickup Management System</span>
      </footer>
    </div>
  );
}
