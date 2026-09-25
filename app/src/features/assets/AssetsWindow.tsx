import { useState } from 'react';

import ObjectsPanel from '../objects/ObjectsPanel';
import SensorsPanel from '../sensors/SensorsPanel';
import ChipFilterGroup from '../../shared/ui/ChipFilterGroup';

type AssetsTab = 'objects' | 'sensors';

const tabOptions: { value: AssetsTab; label: string }[] = [
  { value: 'objects', label: 'Объекты' },
  { value: 'sensors', label: 'Датчики' },
];

export default function AssetsWindow() {
  const [tab, setTab] = useState<AssetsTab>('objects');

  return (
    <>
      <div className="win-toolbar">
        <ChipFilterGroup options={tabOptions} value={tab} onChange={setTab} />
      </div>

      {tab === 'objects' ? <ObjectsPanel /> : <SensorsPanel />}
    </>
  );
}
