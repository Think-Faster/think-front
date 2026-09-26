import { Fragment } from 'react';

export interface BreadcrumbItem {
  label: string;
  emphasized?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <div className="crumb">
      {items.map((item, index) => (
        <Fragment key={item.label}>
          {item.emphasized ? <b>{item.label}</b> : <span>{item.label}</span>}
          {index < items.length - 1 && <span className="sep">/</span>}
        </Fragment>
      ))}
    </div>
  );
}
