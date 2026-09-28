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

// Обозначения в названии канала — docs/backend/домены-и-сущности.md §11
// (справочник доменов, «обозначения в названии канала»). Код — начало слова,
// за ним может идти номер: «ФРО1», «ГРО1-6», «В23».
const channelCodes: { pattern: RegExp; label: string }[] = [
  { pattern: /^ФАНС[\d-]*$/, label: 'ФАНС — фидер автоматической насосной станции' },
  { pattern: /^ФРО[\d-]*$/, label: 'ФРО — фидер рабочего освещения' },
  { pattern: /^ФАО[\d-]*$/, label: 'ФАО — фидер аварийного освещения' },
  { pattern: /^ГРО[\d-]*$/, label: 'ГРО — группа рабочего освещения' },
  { pattern: /^ФТС[\d-]*$/, label: 'ФТС — фидер теплосети' },
  { pattern: /^ФВ[\d-]*$/, label: 'ФВ — фидер вентиляции' },
  { pattern: /^ОЗК[\d-]*$/, label: 'ОЗК — огнезадерживающий клапан' },
  { pattern: /^ЩАП[\d-]*$/, label: 'ЩАП — щит аварийного питания с АВР' },
  { pattern: /^ПУИ[\d-]*$/, label: 'ПУИ — пульт управления индикацией' },
  { pattern: /^РО[\d-]*$/, label: 'РО — рабочее освещение' },
  { pattern: /^АО[\d-]*$/, label: 'АО — аварийное освещение' },
  { pattern: /^В\d+$/, label: 'В — вентилятор' },
  { pattern: /^Межсекционный$/i, label: '«Межсекционный» — секционный автомат между вводами' },
];

const FEEDER_TARGET_NOTE = 'в скобках и ПК у фидера — то, что он питает, а не его источник';

// Подсказка к названию канала: расшифровка обозначений из справочника.
// Нечего расшифровать — undefined (title не ставится).
export function channelHint(name: string): string | undefined {
  const words = name.split(/[\s,;/]+/).map(word => word.replace(/[()«»"]/g, ''));
  const labels = Array.from(
    new Set(words.flatMap(word => channelCodes.filter(code => code.pattern.test(word)).map(code => code.label)))
  );
  if (labels.length === 0) {
    return undefined;
  }
  const feeder = words.some(word => /^Ф/.test(word));
  const note = feeder && (name.includes('(') || /ПК\d/.test(name)) ? [FEEDER_TARGET_NOTE] : [];
  return [...labels, ...note].join('; ');
}
