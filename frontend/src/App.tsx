import { useEffect, useState, type FormEvent } from 'react';
import { MenuPage } from './features/menu/MenuPage';
import { CartPage, OrderDetailPage, OrdersPage } from './features/orders/OrderPages';
import { OperatorOrdersPage } from './features/operator/OperatorOrdersPage';

interface AuthUser {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'OPERATOR';
}

interface HealthResponse {
  status: string;
}

function HomePage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const [currentView, setCurrentView] = useState<'home' | 'login'>(() => {
    return window.location.pathname === '/login' ? 'login' : 'home';
  });

  // Health check state
  const [healthStatus, setHealthStatus] = useState<'loading' | 'online' | 'offline'>('loading');
  const [healthDetails, setHealthDetails] = useState<string>('Checking backend connection...');

  // Login form state
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync view with browser history
  useEffect(() => {
    function handlePopState() {
      setCurrentView(window.location.pathname === '/login' ? 'login' : 'home');
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function navigateTo(view: 'home' | 'login') {
    setCurrentView(view);
    const path = view === 'login' ? '/login' : '/';
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setFormError(null);
  }

  // Check initial session via /api/v1/auth/me
  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const response = await fetch('/api/v1/auth/me', {
          credentials: 'include',
        });
        if (response.ok) {
          const result = await response.json();
          if (isMounted && result.data) {
            setCurrentUser(result.data);
          }
        } else {
          if (isMounted) {
            setCurrentUser(null);
          }
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Check backend health
  useEffect(() => {
    let isMounted = true;

    async function checkHealth() {
      try {
        const response = await fetch('/api/v1/health');
        if (response.ok) {
          const data: HealthResponse = await response.json();
          if (isMounted) {
            if (data.status === 'ok') {
              setHealthStatus('online');
              setHealthDetails('API server is reachable and reporting status: ok');
            } else {
              setHealthStatus('offline');
              setHealthDetails(`Unexpected response: ${JSON.stringify(data)}`);
            }
          }
        } else {
          if (isMounted) {
            setHealthStatus('offline');
            setHealthDetails(`Server responded with HTTP ${response.status}`);
          }
        }
      } catch (error) {
        if (isMounted) {
          setHealthStatus('offline');
          setHealthDetails(error instanceof Error ? error.message : 'Failed to connect to /api/v1/health');
        }
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Handle Login submission
  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    // Required field validation
    if (!loginEmail.trim() || !loginPassword) {
      setFormError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        setCurrentUser(result.data);
        setLoginEmail('');
        setLoginPassword('');
        navigateTo('home');
      } else {
        setFormError(result.error?.message || 'Invalid email or password.');
      }
    } catch {
      setFormError('Failed to connect to authentication server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Logout
  async function handleLogout() {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setCurrentUser(null);
      navigateTo('home');
    }
  }

  return (
    <>
      <header>
        <div className="container header-content">
          <div className="brand" onClick={() => navigateTo('home')}>
            <span className="logo-badge">CB</span>
            <div>
              <h1>CampusBite</h1>
              <p className="tagline">Campus Food Pre-Ordering and Pickup Management System</p>
            </div>
          </div>

          <div className="nav-actions">
            <a className="home-menu-link" href="/menu">
              Browse menu
            </a>

            {currentUser?.role === 'CUSTOMER' && (
              <>
                <a className="home-menu-link" href="/cart">
                  Cart
                </a>
                <a className="home-menu-link" href="/orders">
                  My Orders
                </a>
              </>
            )}

            {currentUser?.role === 'OPERATOR' && (
              <a className="home-menu-link" href="/operator/orders" style={{ color: '#dd6b20' }}>
                Operator Orders
              </a>
            )}

            {authLoading ? (
              <span style={{ fontSize: '0.85rem', color: '#718096' }}>Checking session...</span>
            ) : currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="user-badge">
                  <span>{currentUser.email}</span>
                  <span
                    className={`role-badge ${
                      currentUser.role === 'OPERATOR' ? 'role-operator' : 'role-customer'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                </span>
                <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => navigateTo(currentView === 'login' ? 'home' : 'login')}
              >
                {currentView === 'login' ? 'Back to Home' : 'Sign In'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container">
        {currentView === 'login' ? (
          <section className="card" style={{ maxWidth: '480px', margin: '2rem auto' }}>
            <h2 className="card-title">Sign In to CampusBite</h2>
            <p style={{ fontSize: '0.9rem', color: '#718096', marginBottom: '1.25rem' }}>
              Sign in with your seeded Customer or Operator credentials.
            </p>

            {formError && <div className="form-error">{formError}</div>}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="login-email">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  className="form-control"
                  placeholder="name@campusbite.test"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  className="form-control"
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div className="demo-credentials-box">
              <h4>Synthetic Demo Accounts (Seeded):</h4>
              <p style={{ marginBottom: '0.35rem' }}>
                <strong>Customer:</strong> <code>customer1@campusbite.test</code>
              </p>
              <p style={{ marginBottom: '0.35rem' }}>
                <strong>Operator:</strong> <code>operator@campusbite.test</code>
              </p>
              <p>
                <strong>Password:</strong> <code>DemoPassword123!</code>
              </p>
            </div>
          </section>
        ) : (
          <>
            {/* Authenticated user banner if logged in */}
            {currentUser && (
              <section className="card" style={{ borderLeft: '4px solid #319795' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 className="card-title" style={{ margin: 0 }}>
                      Welcome, {currentUser.email}
                    </h2>
                    <p style={{ fontSize: '0.9rem', color: '#4a5568', marginTop: '0.25rem' }}>
                      Authenticated role: <strong>{currentUser.role}</strong>. Your session is active and stored in an HTTP-only secure cookie.
                    </p>
                  </div>
                  <span
                    className={`role-badge ${
                      currentUser.role === 'OPERATOR' ? 'role-operator' : 'role-customer'
                    }`}
                    style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
                  >
                    {currentUser.role}
                  </span>
                </div>
              </section>
            )}

            {/* Backend API Connectivity */}
            <section className="card">
              <h2 className="card-title">Backend API Connectivity</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div className={`status-pill status-${healthStatus}`}>
                  <span className={`status-dot dot-${healthStatus}`} />
                  {healthStatus === 'online' && 'Connected (HTTP 200)'}
                  {healthStatus === 'offline' && 'Disconnected'}
                  {healthStatus === 'loading' && 'Checking...'}
                </div>
                <span style={{ fontSize: '0.9rem', color: '#4a5568' }}>{healthDetails}</span>
              </div>
            </section>

            {/* Sprint 1 Development Status */}
            <section className="card">
              <h2 className="card-title">Sprint 1 Development Status</h2>
              <p style={{ fontSize: '0.95rem', color: '#4a5568', marginBottom: '0.5rem' }}>
                Sprint 1 implementation progress:
              </p>
              <ul className="feature-list">
                <li>
                  <span>
                    <strong>F-01</strong> — Authentication &amp; Role-based Access (Customer / Operator)
                  </span>
                  <span className="feature-tag tag-active">Implemented (Issue #1)</span>
                </li>
                <li>
                  <span>
                    <strong>F-02</strong> — Menu Browsing &amp; Real-time Stock Display
                  </span>
                  <span className="feature-tag tag-active">Implemented (Issue #2)</span>
                </li>
                <li>
                  <span>
                    <strong>F-03</strong> — Customer Orders &amp; Atomic Stock Reservation
                  </span>
                  <span className="feature-tag tag-active">Implemented (Issue #3)</span>
                </li>
                <li>
                  <span>
                    <strong>F-04</strong> — Operator Order Acceptance &amp; Processing
                  </span>
                  <span className="feature-tag tag-active">Implemented (Issue #4)</span>
                </li>
              </ul>
            </section>
          </>
        )}
      </main>

      <footer>
        <div className="container">
          <p>CPE334 Software Engineering — Team 67070503481 (Lae Lae Kaung Nyunt) &amp; 67070503484 (Naing Zay Linn)</p>
        </div>
      </footer>
    </>
  );
}

export function App() {
  const path = window.location.pathname;
  if (path === '/menu') return <MenuPage />;
  if (path === '/cart') return <CartPage />;
  if (path === '/orders') return <OrdersPage />;
  const orderMatch = path.match(/^\/orders\/([^/]+)$/);
  if (orderMatch) return <OrderDetailPage orderId={decodeURIComponent(orderMatch[1])} />;
  if (path === '/operator/orders') return <OperatorOrdersPage />;
  return <HomePage />;
}
