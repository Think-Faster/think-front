export default function ObjectCardWindow() {
  return (
    <div className="obj-grid">

      <div className="obj-left">

        <div className="obj-field-label">
          Объект
        </div>

        <div className="obj-field-val title">
          К-142 · Коллектор,
          Южный узел
        </div>

        <div className="obj-field-label">
          Тема
        </div>

        <div className="obj-field-val">
          Повреждение коллектора
        </div>

        <div className="obj-field-label">
          Описание
        </div>

        <div className="obj-field-val">
          Зафиксирован рост температуры
          и изменение давления на участке
          24+300–24+400.
        </div>

        <div className="obj-field-label">
          Датчики
        </div>

        <span className="sensor-tag">
          T-142-04
        </span>

        <span className="sensor-tag">
          P-142-02
        </span>

        <span className="sensor-tag">
          F-142-01
        </span>

      </div>

      <div className="obj-right">

        <div className="obj-field-label">
          Участок схемы
        </div>

        <div className="mini-schem">
          <i />
        </div>

        <div className="mini-schem-lbl">
          24+000 ──────── 24+400
        </div>

        <div className="obj-field-label">
          История прогнозов
        </div>

        <div className="hist-item">
          <span>
            Повреждение коллектора
          </span>

          <span className="d">
            активен
          </span>
        </div>

      </div>

    </div>
  );
}