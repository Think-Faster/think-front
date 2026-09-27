interface ListFooterProps {
  count: number;
  hasMore: boolean;
  loading: boolean;
  onMore: () => void;
}

// Низ списка: «Подгрузить ещё», пока есть страницы, и отметка конца.
export default function ListFooter({ count, hasMore, loading, onMore }: ListFooterProps) {
  if (count === 0) {
    return null;
  }

  if (hasMore) {
    return (
      <button className="list-more" onClick={onMore} disabled={loading}>
        {loading ? 'Загрузка…' : 'Подгрузить ещё'}
      </button>
    );
  }

  return <div className="list-end">Вы дошли до конца списка</div>;
}
