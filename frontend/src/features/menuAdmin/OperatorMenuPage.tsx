import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { formatPriceSatang } from '../menu/menuApi';
import {
  adjustMenuStock,
  createMenuItem,
  editMenuItem,
  fetchAdminMenu,
  MenuAdminError,
  type MenuAdminItem,
  type MenuMetadata,
} from './menuAdminApi';

const maxMenuValue = 2_147_483_647;
const blankDetails = { name: '', description: '', price: '' };
type DetailsDraft = typeof blankDetails;

function detailsFrom(item: MenuAdminItem): DetailsDraft {
  return {
    name: item.name,
    description: item.description ?? '',
    price: (item.priceSatang / 100).toFixed(2),
  };
}

function parseDetails(draft: DetailsDraft): MenuMetadata {
  const name = draft.name.trim();
  const description = draft.description.trim();
  if (!name || [...name].length > 100) throw new Error('Enter a name with 1–100 characters.');
  if ([...description].length > 500) throw new Error('Description can contain at most 500 characters.');
  const price = draft.price.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(price)) throw new Error('Enter a THB price with up to two decimal places.');
  const [baht, fraction = ''] = price.split('.');
  const priceSatang = Number(baht) * 100 + Number(fraction.padEnd(2, '0'));
  if (priceSatang > maxMenuValue) throw new Error('Price cannot exceed ฿21,474,836.47.');
  return { name, description: description || null, priceSatang };
}

function parseStock(draft: string): number {
  const value = draft.trim();
  if (!/^\d+$/.test(value) || Number(value) > maxMenuValue) {
    throw new Error('Enter a whole stock quantity from 0 to 2,147,483,647.');
  }
  return Number(value);
}

function errorMessage(error: unknown): string {
  if (error instanceof TypeError) return 'Unable to reach the server. Please try again.';
  return error instanceof Error ? error.message : 'The menu request could not be completed.';
}

function DetailsFields({ draft, onChange }: {
  draft: DetailsDraft;
  onChange: (draft: DetailsDraft) => void;
}) {
  const id = useId();
  return (
    <>
      <div className="form-group">
        <label htmlFor={`${id}-name`}>Name</label>
        <input id={`${id}-name`} className="form-control" required value={draft.name}
          onChange={(event) => onChange({ ...draft, name: event.target.value })} />
      </div>
      <div className="form-group">
        <label htmlFor={`${id}-description`}>Description</label>
        <textarea id={`${id}-description`} className="form-control" rows={2} value={draft.description}
          onChange={(event) => onChange({ ...draft, description: event.target.value })} />
      </div>
      <div className="form-group">
        <label htmlFor={`${id}-price`}>Price (THB)</label>
        <input id={`${id}-price`} className="form-control" inputMode="decimal" required value={draft.price}
          onChange={(event) => onChange({ ...draft, price: event.target.value })} />
      </div>
    </>
  );
}

function CreateForm({ onSave }: { onSave: (item: MenuAdminItem) => void }) {
  const [draft, setDraft] = useState(blankDetails);
  const [stock, setStock] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError('');
    try {
      onSave(await createMenuItem({ ...parseDetails(draft), stockQuantity: parseStock(stock) }));
      setDraft(blankDetails);
      setStock('');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <section className="order-panel">
      <h2 id="create-menu-item">Create item</h2>
      <p>New items are saved as inactive.</p>
      <form aria-labelledby="create-menu-item" onSubmit={submit}>
        {error && <p className="order-error" role="alert">{error}</p>}
        <fieldset className="menu-admin-fields" disabled={saving}>
          <DetailsFields draft={draft} onChange={setDraft} />
          <div className="form-group">
            <label htmlFor="initial-stock">Initial available stock</label>
            <input id="initial-stock" className="form-control" inputMode="numeric" required
              value={stock} onChange={(event) => setStock(event.target.value)} />
          </div>
          <button className="btn btn-primary">{saving ? 'Creating…' : 'Create item'}</button>
        </fieldset>
      </form>
    </section>
  );
}

function EditForms({ item, onSave }: {
  item: MenuAdminItem;
  onSave: (item: MenuAdminItem, message?: string) => void;
}) {
  const [draft, setDraft] = useState(() => detailsFrom(item));
  const [isActive, setActive] = useState(item.isActive);
  const [stock, setStock] = useState(String(item.stockQuantity));
  const [expectedStock, setExpectedStock] = useState<number | null>(item.stockQuantity);
  const [saving, setSaving] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [stockMessage, setStockMessage] = useState('');
  const inFlight = useRef(false);

  async function save(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    try {
      await action();
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  function refreshExpectedStock(conflictMessage = '') {
    return fetchAdminMenu().then((items) => {
      const saved = items.find(({ id }) => id === item.id);
      if (!saved) throw new Error('This item is no longer in the menu.');
      setExpectedStock(saved.stockQuantity);
      onSave(saved);
      setStockMessage(`${conflictMessage} Saved stock is ${saved.stockQuantity}. Review your quantity before submitting again.`.trim());
    }).catch((failure: unknown) => {
      setStockMessage(`Could not refresh the saved stock. ${errorMessage(failure)}`);
    });
  }

  function submitDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save(async () => {
      setDetailError('');
      try {
        const saved = await editMenuItem(item.id, { ...parseDetails(draft), isActive });
        setDraft(detailsFrom(saved));
        setActive(saved.isActive);
        onSave(saved, 'Item details saved.');
      } catch (failure) {
        setDetailError(errorMessage(failure));
      }
    });
  }

  function submitStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (expectedStock === null) return;
    void save(async () => {
      setStockMessage('');
      try {
        const saved = await adjustMenuStock(item.id, parseStock(stock), expectedStock);
        setStock(String(saved.stockQuantity));
        setExpectedStock(saved.stockQuantity);
        onSave(saved, 'Available stock saved.');
      } catch (failure) {
        if (failure instanceof MenuAdminError && failure.status === 409) {
          setExpectedStock(null);
          await refreshExpectedStock(failure.code === 'STOCK_LIMIT_EXCEEDED' ? failure.message : '');
        } else {
          setStockMessage(errorMessage(failure));
        }
      }
    });
  }

  return (
    <section className="order-panel">
      <h2 id="edit-menu-item">Edit {item.name}</h2>
      <form aria-labelledby="edit-menu-item" onSubmit={submitDetails}>
        {detailError && <p className="order-error" role="alert">{detailError}</p>}
        <fieldset className="menu-admin-fields" disabled={saving}>
          <DetailsFields draft={draft} onChange={setDraft} />
          <div className="form-group">
            <label htmlFor="menu-item-active">
              <input id="menu-item-active" type="checkbox" checked={isActive}
                onChange={(event) => setActive(event.target.checked)} /> Active on the public menu
            </label>
          </div>
          <button className="btn btn-primary">Save details</button>
        </fieldset>
      </form>
      <form aria-labelledby="adjust-available-stock" className="menu-admin-stock" onSubmit={submitStock}>
        <h3 id="adjust-available-stock">Adjust available stock</h3>
        <p>Saved quantity: {item.stockQuantity}</p>
        {stockMessage && <p className="order-error" role="alert">{stockMessage}</p>}
        <fieldset className="menu-admin-fields" disabled={saving}>
          <div className="form-group">
            <label htmlFor="available-stock">New available stock</label>
            <input id="available-stock" className="form-control" inputMode="numeric" required
              value={stock} onChange={(event) => setStock(event.target.value)} />
          </div>
          <button className="btn btn-primary" disabled={expectedStock === null}>Save stock</button>
          {expectedStock === null && (
            <button className="btn btn-outline" type="button" onClick={() => void save(refreshExpectedStock)}>
              Refresh saved stock
            </button>
          )}
        </fieldset>
      </form>
    </section>
  );
}

export function OperatorMenuPage() {
  const [items, setItems] = useState<MenuAdminItem[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [notice, setNotice] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchAdminMenu(controller.signal).then(setItems).catch((failure: unknown) => {
      if (controller.signal.aborted) return;
      setError({
        message: errorMessage(failure),
        status: failure instanceof MenuAdminError ? failure.status : undefined,
      });
    });
    return () => controller.abort();
  }, [loadAttempt]);

  function saveItem(item: MenuAdminItem, message = '') {
    setItems((current) => {
      const updated = (current ?? []).filter(({ id }) => id !== item.id);
      return [...updated, item].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    });
    setNotice(message);
  }

  const selected = items?.find(({ id }) => id === selectedId);
  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <a className="order-text-link" href="/">CampusBite</a>
          <nav className="order-nav" aria-label="Operator navigation">
            {items && <a href="/operator/orders">Operator Orders</a>}
            {items && <a href="/operator/menu" aria-current="page">Menu administration</a>}
            <a href="/menu">Browse menu</a>
          </nav>
        </div>
      </header>
      <main className="order-page">
        <div className="order-heading"><h1>Menu administration</h1></div>
        {error ? (
          <section className="order-panel">
            <p className="order-error" role="alert">
              {error.status === 401 ? 'Sign in to manage the menu.' :
                error.status === 403 ? 'Only operators can manage the menu.' : error.message}
            </p>
            {error.status === 401 && <a className="order-text-link" href="/login">Sign in</a>}
            {error.status !== 401 && error.status !== 403 && (
              <button className="btn btn-outline" onClick={() => {
                setError(null);
                setLoadAttempt((attempt) => attempt + 1);
              }}>Retry</button>
            )}
          </section>
        ) : items === null ? <p role="status">Loading menu items…</p> : (
          <div className="menu-admin-layout">
            <p className="menu-admin-notice" role="status">{notice}</p>
            <section className="order-panel">
              <h2>Menu items</h2>
              {items.length === 0 ? <p>No menu items yet.</p> : (
                <ul className="menu-admin-list">
                  {items.map((item) => (
                    <li key={item.id}>
                      <div>
                        <strong>{item.name}</strong>
                        <p>{formatPriceSatang(item.priceSatang)} · {item.stockQuantity} available · {
                          item.isActive ? (item.stockQuantity === 0 ? 'Active (Sold Out)' : 'Active') : 'Inactive'
                        }</p>
                      </div>
                      <button className="btn btn-outline btn-sm" type="button" aria-pressed={item.id === selectedId}
                        onClick={() => setSelectedId(item.id)}>Edit</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {selected && <EditForms key={selected.id} item={selected} onSave={saveItem} />}
            <CreateForm onSave={(item) => saveItem(item, 'Item created as inactive.')} />
          </div>
        )}
      </main>
    </div>
  );
}
