import { SVGProps } from 'react';

// Иконки из макета «думай резче» (Даша, 27.09): пути перенесены из SVG как
// есть, цвет — через currentColor, чтобы состояния задавал CSS.

type IconProps = SVGProps<SVGSVGElement>;

export function LogoMark(props: IconProps) {
  return (
    <svg viewBox="63 65 54 26" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M102.547 65.6864C94.4016 67.0541 78.1121 75.5042 78.1121 75.5042C78.1121 75.5042 97.1664 71.353 103.606 71.265C112.796 71.1395 116.815 77.7939 116.815 77.7939C116.815 77.7939 113.822 63.7931 102.547 65.6864Z" />
      <path d="M77.4532 90.3136C85.5984 88.9459 101.888 80.4958 101.888 80.4958C101.888 80.4958 82.8335 84.647 76.3941 84.735C67.2042 84.8605 63.1847 78.2061 63.1847 78.2061C63.1847 78.2061 66.1778 92.2069 77.4532 90.3136Z" />
    </svg>
  );
}

export function CurtainIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 28 26" fill="none" stroke="currentColor" aria-hidden="true" {...props}>
      <rect x="3.5" y="3.5" width="21" height="19" rx="3.5" />
      <line x1="8.5" y1="3" x2="8.5" y2="23" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg viewBox="79 23 39 39" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M108.25 30.8V26.9C108.25 24.755 106.495 23 104.35 23H92.65C90.505 23 88.75 24.755 88.75 26.9V30.8H79V34.7H82.9V58.1C82.9 60.245 84.655 62 86.8 62H110.2C112.345 62 114.1 60.245 114.1 58.1V34.7H118V30.8H108.25ZM92.65 26.9H104.35V30.8H92.65V26.9ZM110.2 58.1H86.8V34.7H110.2V58.1Z" />
      <path d="M102.966 39.1655L98.5 43.6505L94.0345 39.1655L91.2655 41.9345L95.7505 46.4L91.2655 50.8655L94.0345 53.6345L98.5 49.1495L102.966 53.6345L105.735 50.8655L101.25 46.4L105.735 41.9345L102.966 39.1655Z" />
    </svg>
  );
}

const CIRCLE =
  'M7 0C3.13438 0 0 3.13438 0 7C0 10.8656 3.13438 14 7 14C10.8656 14 14 10.8656 14 7C14 3.13438 10.8656 0 7 0ZM7 12.8125C3.79063 12.8125 1.1875 10.2094 1.1875 7C1.1875 3.79063 3.79063 1.1875 7 1.1875C10.2094 1.1875 12.8125 3.79063 12.8125 7C12.8125 10.2094 10.2094 12.8125 7 12.8125Z';
const DASH =
  'M9.875 6.5H4.125C4.05625 6.5 4 6.55625 4 6.625V7.375C4 7.44375 4.05625 7.5 4.125 7.5H9.875C9.94375 7.5 10 7.44375 10 7.375V6.625C10 6.55625 9.94375 6.5 9.875 6.5Z';
const BAR =
  'M7.5 9.875V4.125C7.5 4.05625 7.44375 4 7.375 4H6.625C6.55625 4 6.5 4.05625 6.5 4.125V9.875C6.5 9.94375 6.55625 10 6.625 10H7.375C7.44375 10 7.5 9.94375 7.5 9.875Z';

export function MinusCircleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 14 14" fill="currentColor" aria-hidden="true" {...props}>
      <path className="icon-inner" d={DASH} />
      <path d={CIRCLE} />
    </svg>
  );
}

export function PlusCircleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 14 14" fill="currentColor" aria-hidden="true" {...props}>
      <path className="icon-inner" d={DASH} />
      <path className="icon-inner" d={BAR} />
      <path d={CIRCLE} />
    </svg>
  );
}

export function ReloadIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M13 8a5 5 0 1 1-1.46-3.54" />
      <path d="M13 2.5v3h-3" strokeLinejoin="round" />
    </svg>
  );
}

export function MinimizeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M3.5 8h9" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />
      <path d="M2 4.5l6 4.5 6-4.5" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" {...props}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5l3 3" />
    </svg>
  );
}
