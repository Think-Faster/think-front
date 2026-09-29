import { usePredictionStats } from './hooks/usePredictionStats';
import { predictionTypeLabels } from './predictionLabels';

function formatHour(value: string): string {
  return new Date(value).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
}

// Сводка над «Журналом прогнозов»: сколько тревог горит и ждёт решения, приток и отток за сутки и
// сверка с последним тактом модели — чтобы видеть, что поток карточек в норме (BFF DECISIONS.md,
// «Сверка „всё ли в норме“»). Карточка одна на серию часов тревоги; кончилась тревога — карточка
// без решения истекает, поэтому «горит» не растёт без предела.
export default function PredictionStatsPanel() {
  const { stats, lastTick, error } = usePredictionStats();

  if (error) {
    return <div className="status-note rej pstats-error">{error}</div>;
  }

  if (!stats) {
    return null;
  }

  // Такт модели сравним с журналом, только если это тот же час, что последний час в журнале.
  const sameHour = lastTick && stats.lastHourEnd && new Date(lastTick.hourEnd).getTime() === new Date(stats.lastHourEnd).getTime();
  const rows = stats.byType.filter(row => row.activeAlarms + row.open + row.createdLast24h + row.endedLast24h > 0 || (lastTick?.alarmsByType[row.type] ?? 0) > 0);
  const mismatch = sameHour ? rows.some(row => (lastTick!.alarmsByType[row.type] ?? 0) !== row.activeAlarms) : false;

  return (
    <details className="pstats">
      <summary>
        <span>
          Горит тревог: <b>{stats.activeAlarms}</b>
        </span>
        <span>
          ждут решения: <b>{stats.open}</b>
        </span>
        <span>
          за сутки: <b>+{stats.createdLast24h}</b> новых, <b>{stats.endedLast24h}</b> кончились
        </span>
        {(stats.staleAlarms > 0 || mismatch) && <span className="pstats-warn">есть расхождения</span>}
      </summary>

      <p className="pstats-note">
        Модель пересчитывает каждый объект раз в час. Пока тревога держится, это одна карточка. Когда тревога
        кончается, карточка без решения получает статус «истёк». Сколько часов модель считает тревожными,
        задаёт рабочая доля в «Настройках модели».
        {stats.lastHourEnd && <> Последний час в журнале: {formatHour(stats.lastHourEnd)}.</>}
      </p>

      {stats.staleAlarms > 0 && (
        <div className="status-note rej pstats-alert">
          Модель не подтверждает {stats.staleAlarms} тревог(и) больше часа. Сообщения модели могли не дойти: проверьте
          поток прогнозов.
        </div>
      )}

      {rows.length > 0 && (
        <div className="pstats-table-wrap">
          <table className="pstats-table">
            <thead>
              <tr>
                <th>Тип</th>
                <th title="Тревога модели горит, любой статус карточки">Горит</th>
                {lastTick && <th title="Тревог этого типа в последнем такте модели">В такте модели</th>}
                <th>Ждут</th>
                <th>В работе</th>
                <th>Заглушено</th>
                <th>+24 ч</th>
                <th>−24 ч</th>
              </tr>
            </thead>

            <tbody>
              {rows.map(row => {
                const model = lastTick?.alarmsByType[row.type];
                const off = sameHour && (model ?? 0) !== row.activeAlarms;

                return (
                  <tr key={row.type}>
                    <td>{predictionTypeLabels[row.type]}</td>
                    <td className="num">{row.activeAlarms}</td>
                    {lastTick && <td className={`num ${off ? 'pstats-off' : ''}`}>{model ?? '—'}</td>}
                    <td className="num">{row.open}</td>
                    <td className="num">{row.taken}</td>
                    <td className="num">{row.muted}</td>
                    <td className="num">{row.createdLast24h}</td>
                    <td className="num">{row.endedLast24h}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {lastTick && !sameHour && (
        <p className="pstats-note">
          Такт модели ({formatHour(lastTick.hourEnd)}) и последний час журнала не совпадают, поэтому сверка по типам
          не проводится. Если так остаётся дольше часа, прогнозы до журнала не доходят.
        </p>
      )}
      {mismatch && (
        <p className="pstats-note">
          Горящих тревог в журнале не столько же, сколько в такте модели: часть сообщений модели не записана.
        </p>
      )}
    </details>
  );
}
