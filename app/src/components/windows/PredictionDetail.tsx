import {
    Link,
    useNavigate,
} from 'react-router-dom';

import {
    predictions,
} from '../../data/mockData';

interface Props {
    predictionId: string;
}

export default function PredictionDetail({
    predictionId,
}: Props) {
    const navigate = useNavigate();

    const prediction =
        predictions.find(
            x => x.id === predictionId
        );

    if (!prediction) {
        return (
            <div className="empty-note">
                Прогноз не найден
            </div>
        );
    }

    function accept() {
        prediction!.status = 'work';
    }

    function reject() {
        prediction!.status = 'rejected';
        prediction!.rejectReason =
            'Ошибка датчика';
    }

    return (
        <div className="pd-body">

            <div className="pd-risk-row">

                <span
                    className={`badge ${prediction.risk}`}
                >
                    {prediction.risk === 'high'
                        ? 'Высокий риск'
                        : prediction.risk === 'med'
                            ? 'Средний риск'
                            : 'Наблюдение'}
                </span>

            </div>

            <p className="pd-title">
                {prediction.title}
            </p>

            <p className="pd-loc">
                {prediction.object}
                {' · '}
                {prediction.segment}
            </p>

            <div className="pd-prob">

                <span className="num">
                    {prediction.probability}%
                </span>

                <span className="unit">
                    вероятность
                </span>

            </div>

            <div className="pd-bar">
                <i
                    style={{
                        width:
                            `${prediction.probability}%`,
                    }}
                />
            </div>

            <div className="pd-horizon">
                Горизонт прогноза:{' '}
                <b>
                    {prediction.horizon}
                </b>
            </div>

            <p className="pd-section-title">
                Почему
            </p>

            <ul className="why-list">
                {prediction.why.map(reason => (
                    <li key={reason}>
                        {reason}
                    </li>
                ))}
            </ul>

            <div className="rec-box">

                <div className="lbl">
                    Рекомендация
                </div>

                <div className="txt">
                    {prediction.recommendation}
                </div>

            </div>

            {prediction.status === 'new' && (
                <div className="pd-actions">

                    <button
                        className="btn"
                        onClick={reject}
                    >
                        Отклонить
                    </button>

                    <button
                        className="btn primary"
                        onClick={accept}
                    >
                        Взять в работу
                    </button>

                </div>
            )}

            {prediction.status === 'work' && (
                <div className="status-note ok">
                    Взято в работу · задача передана
                    инженеру
                </div>
            )}

            {prediction.status === 'rejected' && (
                <div className="status-note rej">
                    Отклонён · причина:{' '}
                    {prediction.rejectReason}
                </div>
            )}

            <Link
                className="prediction-open-link"
                to={`/predictions/${prediction.id}`}
            >
                Открыть прямую ссылку
            </Link>

        </div>
    );
}