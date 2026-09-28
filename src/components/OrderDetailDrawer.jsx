import Drawer from './Drawer.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';

// FR-007 — a visual status progression, not just a badge. Cancelled is a
// distinct terminal state (branches off the main flow) rather than a step
// in it, matching spec.md's example.
const FLOW = ['pending', 'confirmed', 'processing', 'ready_for_delivery', 'out_for_delivery', 'completed'];

const STAGE_LABEL = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  ready_for_delivery: 'Ready for Delivery',
  out_for_delivery: 'Out for Delivery',
  completed: 'Completed',
};

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function StatusTimeline({ status }) {
  if (status === 'cancelled') {
    return (
      <div>
        <span className="badge badge-coral">Cancelled</span>
        <p className="muted" style={{ marginTop: '0.5rem' }}>
          This order was cancelled and will not proceed further.
        </p>
      </div>
    );
  }
  const currentIndex = FLOW.indexOf(status);
  return (
    <ol className="order-timeline">
      {FLOW.map((stage, i) => (
        <li key={stage} className={i <= currentIndex ? 'reached' : ''}>
          {STAGE_LABEL[stage]}
        </li>
      ))}
    </ol>
  );
}

export default function OrderDetailDrawer({ order, open, onClose }) {
  const { format } = useCurrency();

  return (
    <Drawer open={open} onClose={onClose} title={order ? `Order ${order.id.slice(0, 8)}` : ''}>
      {order && (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <div>
            <StatusTimeline status={order.status} />
            <p className="muted" style={{ marginTop: '0.75rem' }}>{formatDateTime(order.placed_at)}</p>
          </div>
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>Items</h4>
            {order.items.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                <span>
                  {item.quantity}× {item.product_name}
                </span>
                <span>{format(item.unit_price)}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Subtotal</span>
              <span>{format(order.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Discount</span>
              <span>{format(order.discount_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>Total</span>
              <span>{format(order.total)}</span>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
