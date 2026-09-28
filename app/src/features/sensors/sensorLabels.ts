import { SensorTypeOption } from '../../entities/sensor/types';
import { ChoiceOption } from '../../shared/ui/ChoiceField';
import { systems } from '../map/collector';

// Подсистемы: справочник карты (цвет и буква значка) плюс те, что уже
// встречаются у датчиков.
export function sensorSystemOptions(types: SensorTypeOption[]): ChoiceOption[] {
  const names = [...systems.map(system => system.name), ...types.map(type => type.system)];
  return Array.from(new Set(names)).map(name => ({ value: name, label: name }));
}

// Типы датчиков выбранной подсистемы; без подсистемы — все.
export function sensorTypeOptions(types: SensorTypeOption[], system: string): ChoiceOption[] {
  const names = types.filter(type => !system || type.system === system).map(type => type.sType);
  return Array.from(new Set(names))
    .sort((a, b) => a.localeCompare(b, 'ru'))
    .map(name => ({ value: name, label: name }));
}

