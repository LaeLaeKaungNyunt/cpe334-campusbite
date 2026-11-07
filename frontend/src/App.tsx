import { useEffect, useState } from 'react';

interface HealthResponse {
  status: string;
}

export function App() {
  const [healthStatus, setHealthStatus] = useState<'loading' | 'online' | 'offline'>('loading');
  const [healthDetails, setHealthDetails] = useState<string>('Checking backend connection...');

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

  return (
    <>
      <header>
        <div className="container header-content">
          <div className="brand">
            <span className="logo-badge">CB</span>
            <div>
              <h1>CampusBite</h1>
              <p className="tagline">Campus Food Pre-Ordering and Pickup Management System</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container">
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

        <section className="card">
          <h2 className="card-title">Sprint 1 Development Status</h2>
          <p style={{ fontSize: '0.95rem', color: '#4a5568', marginBottom: '0.5rem' }}>
            The shared application foundation (CHORE-01) is active. Feature-specific workflows
            are scheduled for implementation in subsequent sprint issues:
          </p>
          <ul className="feature-list">
            <li>
              <span>
                <strong>F-01</strong> — Authentication &amp; Role-based Access (Customer / Operator)
              </span>
              <span className="feature-tag tag-pending">Issue #1</span>
            </li>
            <li>
              <span>
                <strong>F-02</strong> — Menu Browsing &amp; Real-time Stock Display
              </span>
              <span className="feature-tag tag-pending">Issue #2</span>
            </li>
            <li>
              <span>
                <strong>F-03</strong> — Customer Orders &amp; Atomic Stock Reservation
              </span>
              <span className="feature-tag tag-pending">Issue #3</span>
            </li>
            <li>
              <span>
                <strong>F-04</strong> — Operator Order Acceptance &amp; Processing
              </span>
              <span className="feature-tag tag-pending">Issue #4</span>
            </li>
          </ul>
        </section>
      </main>

      <footer>
        <div className="container">
          <p>CPE334 Software Engineering — Team 67070503481 (Lae Lae Kaung Nyunt) &amp; 67070503484 (Naing Zay Linn)</p>
        </div>
      </footer>
    </>
  );
}
