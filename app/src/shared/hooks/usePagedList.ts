import { useCallback, useEffect, useRef, useState } from 'react';

import { PagedResult } from '../../core/api/types';
import { formatBffErrorMessage } from '../../core/errors/bffError';

// Списки в окнах — по 10 записей и «Подгрузить ещё» (доменный документ,
// §8). BFF отдаёт страницы page/pageSize, курсора пока нет.
export const LIST_PAGE_SIZE = 10;

interface PageQuery {
  page: number;
  pageSize: number;
}

// key — отпечаток фильтров: сменился — список читается заново с первой
// страницы. fetchPage можно передавать новой функцией на каждом рендере.
export function usePagedList<T>(
  key: string,
  fetchPage: (query: PageQuery) => Promise<PagedResult<T>>,
  errorMessage: string,
  pageSize: number = LIST_PAGE_SIZE
) {
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const generation = useRef(0);

  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const current = ++generation.current;
    setLoading(true);
    setError('');

    fetchRef
      .current({ page: 1, pageSize })
      .then(result => {
        if (current === generation.current) {
          setItems(result.items);
          setTotal(result.total);
          setPage(1);
        }
      })
      .catch(err => {
        if (current === generation.current) {
          setItems([]);
          setTotal(0);
          setError(formatBffErrorMessage(err, errorMessage));
        }
      })
      .finally(() => {
        if (current === generation.current) {
          setLoading(false);
        }
      });
  }, [key, nonce, pageSize, errorMessage]);

  const loadMore = useCallback(() => {
    const current = generation.current;
    const next = page + 1;
    setLoading(true);

    fetchRef
      .current({ page: next, pageSize })
      .then(result => {
        if (current === generation.current) {
          setItems(existing => [...existing, ...result.items]);
          setTotal(result.total);
          setPage(next);
        }
      })
      .catch(err => {
        if (current === generation.current) {
          setError(formatBffErrorMessage(err, errorMessage));
        }
      })
      .finally(() => {
        if (current === generation.current) {
          setLoading(false);
        }
      });
  }, [page, pageSize, errorMessage]);

  const reload = useCallback(() => setNonce(value => value + 1), []);

  return { items, total, loading, error, hasMore: items.length < total, loadMore, reload };
}
