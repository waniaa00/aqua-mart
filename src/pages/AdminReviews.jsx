import { useCallback, useEffect, useRef, useState } from 'react';
import Modal from '../components/Modal.jsx';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { fetchProducts } from '../api/products.js';
import { listProductReviews, moderateReview } from '../api/admin_reviews.js';
import { ApiError } from '../api/client.js';

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function Stars({ rating }) {
  return <span aria-label={`${rating} out of 5 stars`}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>;
}

export default function AdminReviews() {
  const { token } = useAdminAuth();

  const [productSearch, setProductSearch] = useState('');
  const [productOptions, setProductOptions] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [ratingFilter, setRatingFilter] = useState('');
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const productSearchKeyRef = useRef(null);

  useEffect(() => {
    const requestKey = productSearch;
    productSearchKeyRef.current = requestKey;
    if (!productSearch.trim()) {
      setProductOptions([]);
      return;
    }
    setProductsLoading(true);
    fetchProducts({ search: productSearch, limit: 10 })
      .then((res) => {
        if (productSearchKeyRef.current !== requestKey) return;
        setProductOptions(res.items);
      })
      .catch(() => {
        if (productSearchKeyRef.current !== requestKey) return;
        setProductOptions([]);
      })
      .finally(() => {
        if (productSearchKeyRef.current !== requestKey) return;
        setProductsLoading(false);
      });
  }, [productSearch]);

  const loadReviews = useCallback(() => {
    if (!selectedProduct) return;
    setReviewsLoading(true);
    setReviewsError(false);
    listProductReviews(selectedProduct.productId)
      .then(setReviews)
      .catch(() => setReviewsError(true))
      .finally(() => setReviewsLoading(false));
  }, [selectedProduct]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await moderateReview(token, pendingDelete.id);
      setPendingDelete(null);
      loadReviews();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Couldn't remove this review.");
    } finally {
      setDeleting(false);
    }
  }

  const visibleReviews = ratingFilter ? reviews.filter((r) => r.rating === Number(ratingFilter)) : reviews;

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="section-head">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Reviews</h1>
        </div>
      </div>

      <p className="muted" style={{ marginBottom: '1rem' }}>
        No cross-product review list exists on the backend, so moderation is scoped to one product at a time — search for a product below to see its reviews.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', minWidth: '260px' }}>
          <input
            className="input"
            type="search"
            placeholder="Search products by name…"
            value={productSearch}
            onChange={(e) => {
              setProductSearch(e.target.value);
              setSelectedProduct(null);
            }}
            aria-label="Search products"
          />
          {productSearch.trim() && !selectedProduct && (
            <div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 5, marginTop: '0.25rem', maxHeight: '260px', overflowY: 'auto' }}>
              {productsLoading && <p className="muted" style={{ padding: '0.75rem' }}>Searching…</p>}
              {!productsLoading && productOptions.length === 0 && <p className="muted" style={{ padding: '0.75rem' }}>No products found.</p>}
              {!productsLoading &&
                productOptions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="dashboard-list-row"
                    style={{ width: '100%', textAlign: 'left' }}
                    onClick={() => {
                      setSelectedProduct(p);
                      setProductSearch(p.name);
                    }}
                  >
                    {p.name}
                  </button>
                ))}
            </div>
          )}
        </div>

        {selectedProduct && (
          <select className="input" style={{ width: 'auto' }} value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r} star{r !== 1 ? 's' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {!selectedProduct && <p className="muted">Select a product to view its reviews.</p>}

      {selectedProduct && (
        <div className="card card-pad">
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>{selectedProduct.name}</h3>
          {reviewsLoading && <p className="muted">Loading reviews…</p>}
          {reviewsError && <p className="muted">Couldn't load reviews right now.</p>}
          {!reviewsLoading && !reviewsError && visibleReviews.length === 0 && <p className="muted">No reviews match this filter.</p>}
          {!reviewsLoading &&
            !reviewsError &&
            visibleReviews.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ color: 'var(--accent)' }}>
                    <Stars rating={r.rating} />
                  </div>
                  <p style={{ margin: '0.35rem 0' }}>{r.review_text}</p>
                  <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>{formatDate(r.created_at)}</p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => setPendingDelete(r)}>
                  Remove
                </button>
              </div>
            ))}
        </div>
      )}

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => (setPendingDelete(null), setDeleteError(''))}
        title="Remove review"
        footer={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setPendingDelete(null)} disabled={deleting}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Removing…' : 'Remove'}
            </button>
          </>
        }
      >
        {pendingDelete && <p>This will permanently remove this {pendingDelete.rating}-star review. This can't be undone.</p>}
        {deleteError && <p style={{ color: 'var(--danger)' }}>{deleteError}</p>}
      </Modal>
    </section>
  );
}
