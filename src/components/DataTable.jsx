import Icon from './Icon.jsx';

// Shared admin table: search + filter slot + sortable columns + pagination
// + optional row-selection (FR-013/FR-014) + mobile card fallback
// (FR-004). Callers own the data fetch/state; this is presentation only.
//
// columns: [{ key, label, sortable?, render?: (row) => node }]
// sort: { key, direction: 'asc'|'desc' } | null
export default function DataTable({
  columns,
  rows,
  rowKey = (row) => row.id,
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters,
  sort,
  onSortChange,
  page = 1,
  pageCount = 1,
  onPageChange,
  loading = false,
  error = false,
  onRetry,
  emptyMessage = 'No results found for this filter.',
  selectable = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
}) {
  const allSelected = selectable && rows.length > 0 && rows.every((r) => selectedIds?.has(rowKey(r)));

  return (
    <div className="data-table-wrap">
      <div className="data-table-toolbar">
        {onSearchChange && (
          <div className="data-table-search">
            <Icon name="search" size={16} />
            <input
              className="input"
              type="search"
              placeholder={searchPlaceholder}
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label={searchPlaceholder}
            />
          </div>
        )}
        {filters && <div className="data-table-filters">{filters}</div>}
      </div>

      {loading && <p className="muted">Loading…</p>}
      {error && (
        <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span>Couldn't load this right now.</span>
          {onRetry && (
            <button className="btn btn-outline btn-sm" onClick={onRetry}>
              Try Again
            </button>
          )}
        </div>
      )}

      {!loading && !error && rows.length === 0 && <p className="muted">{emptyMessage}</p>}

      {!loading && !error && rows.length > 0 && (
        <>
          <div className="data-table-scroll" role="region" aria-label="Results" tabIndex={0}>
            <table className="data-table">
              <thead>
                <tr>
                  {selectable && (
                    <th className="data-table-select-col">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => onToggleSelectAll?.()}
                        aria-label="Select all rows"
                      />
                    </th>
                  )}
                  {columns.map((col) => (
                    <th key={col.key}>
                      {col.sortable ? (
                        <button
                          type="button"
                          className="data-table-sort-btn"
                          onClick={() => onSortChange?.(col.key)}
                        >
                          {col.label}
                          {sort?.key === col.key && (
                            <Icon name={sort.direction === 'asc' ? 'chevron-left' : 'chevron-right'} size={12} />
                          )}
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const id = rowKey(row);
                  return (
                    <tr
                      key={id}
                      className={onRowClick ? 'data-table-row-clickable' : undefined}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {selectable && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={Boolean(selectedIds?.has(id))}
                            onChange={() => onToggleSelect?.(id)}
                            aria-label="Select row"
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card fallback — same data, stacked layout below the
              scrollable table (CSS hides one or the other by width). */}
          <div className="data-table-cards">
            {rows.map((row) => {
              const id = rowKey(row);
              return (
                <div
                  key={id}
                  className={`data-table-card ${onRowClick ? 'data-table-row-clickable' : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {selectable && (
                    <input
                      type="checkbox"
                      checked={Boolean(selectedIds?.has(id))}
                      onChange={(e) => {
                        e.stopPropagation();
                        onToggleSelect?.(id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Select row"
                    />
                  )}
                  {columns.map((col) => (
                    <div key={col.key} className="data-table-card-field">
                      <span className="muted">{col.label}</span>
                      <span>{col.render ? col.render(row) : row[col.key]}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {pageCount > 1 && (
            <div className="data-table-pagination">
              <button
                className="btn btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => onPageChange?.(page - 1)}
              >
                <Icon name="chevron-left" size={14} /> Prev
              </button>
              <span className="muted">
                Page {page} of {pageCount}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page >= pageCount}
                onClick={() => onPageChange?.(page + 1)}
              >
                Next <Icon name="chevron-right" size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
