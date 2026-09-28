import { ComponentType } from 'react';

import EngineerSensorReadings from '../features/engineer/EngineerSensorReadings';
import EngineerTaskCard from '../features/engineer/EngineerTaskCard';
import { EngineerReportForm, EngineerRequestForm } from '../features/engineer/EngineerTaskForms';
import EngineerTaskList from '../features/engineer/EngineerTaskList';

export type EngineerView = 'list' | 'task' | 'report' | 'request' | 'readings';

const views: Record<EngineerView, ComponentType> = {
  list: EngineerTaskList,
  task: EngineerTaskCard,
  report: EngineerReportForm,
  request: EngineerRequestForm,
  readings: EngineerSensorReadings,
};

export default function EngineerPage({ view }: { view: EngineerView }) {
  const View = views[view];
  return <View />;
}
