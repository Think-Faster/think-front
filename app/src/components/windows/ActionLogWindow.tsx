export default function ActionLogWindow() {
  return (
    <div>

      <div className="log-row">
        <span className="t">
          12:45
        </span>

        <span>
          Диспетчер проверил данные
          сенсоров и историю участка
        </span>
      </div>

      <div className="log-row">
        <span className="t">
          12:42
        </span>

        <span>
          Создан прогноз «Повреждение
          коллектора», 87%
        </span>
      </div>

      <div className="log-row">
        <span className="t">
          12:41
        </span>

        <span>
          Система обнаружила аномалию
          на T-142-04
        </span>
      </div>

    </div>
  );
}