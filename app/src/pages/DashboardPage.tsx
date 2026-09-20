import { useLocation } from 'react-router-dom';

import {
  useWindowManager,
} from '../components/windows/WindowManager';

import FloatingWindow from '../components/windows/FloatingWindow';
import PredictionQueue from '../components/windows/PredictionQueue';
import PredictionDetail from '../components/windows/PredictionDetail';
import MapWindow from '../components/windows/MapWindow';
import SchematicWindow from '../components/windows/SchematicWindow';
import TimelineWindow from '../components/windows/TimelineWindow';
import ObjectCardWindow from '../components/windows/ObjectCardWindow';
import StreamWindow from '../components/windows/StreamWindow';
import ActionLogWindow from '../components/windows/ActionLogWindow';

export default function DashboardPage() {
  const { windows } =
    useWindowManager();

  const location = useLocation();

  const selectedPredictionId =
    location.pathname.startsWith(
      '/predictions/'
    )
      ? location.pathname.split('/')[2]
      : 'p1';

  return (
    <>

      <div className="canvas-inner">

        {windows.find(
          x => x.id === 'queue'
        ) && (
          <FloatingWindow
            window={
              windows.find(
                x => x.id === 'queue'
              )!
            }
          >
            <PredictionQueue />
          </FloatingWindow>
        )}

        {windows.find(
          x => x.id === 'map'
        ) && (
          <FloatingWindow
            window={
              windows.find(
                x => x.id === 'map'
              )!
            }
          >
            <MapWindow />
          </FloatingWindow>
        )}

        {windows.find(
          x => x.id === 'pred'
        ) && (
          <FloatingWindow
            window={
              windows.find(
                x => x.id === 'pred'
              )!
            }
          >
            <PredictionDetail
              predictionId={
                selectedPredictionId
              }
            />
          </FloatingWindow>
        )}

        {windows.find(
          x => x.id === 'schem'
        ) && (
          <FloatingWindow
            window={
              windows.find(
                x => x.id === 'schem'
              )!
            }
          >
            <SchematicWindow />
          </FloatingWindow>
        )}

        {windows.find(
          x => x.id === 'timeline'
        ) && (
          <FloatingWindow
            window={
              windows.find(
                x => x.id === 'timeline'
              )!
            }
          >
            <TimelineWindow />
          </FloatingWindow>
        )}

        {windows.find(
          x => x.id === 'object'
        ) && (
          <FloatingWindow
            window={
              windows.find(
                x => x.id === 'object'
              )!
            }
          >
            <ObjectCardWindow />
          </FloatingWindow>
        )}

        {windows.find(
          x => x.id === 'stream'
        ) && (
          <FloatingWindow
            window={
              windows.find(
                x => x.id === 'stream'
              )!
            }
          >
            <StreamWindow />
          </FloatingWindow>
        )}

        {windows.find(
          x => x.id === 'log'
        ) && (
          <FloatingWindow
            window={
              windows.find(
                x => x.id === 'log'
              )!
            }
          >
            <ActionLogWindow />
          </FloatingWindow>
        )}

      </div>

    </>
  );
}