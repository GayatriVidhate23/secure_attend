import React from 'react';

export function Table({ children, className = '' }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className={`w-full text-sm text-left text-slate-500 dark:text-slate-400 ${className}`}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300">
      {children}
    </thead>
  );
}

export function TableBody({ children }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children, className = '' }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={`border-b dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${className}`}>
      {children}
    </tr>
  );
}

export function TableHead({ children, className = '' }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th scope="col" className={`px-6 py-3 font-medium tracking-wider ${className}`}>
      {children}
    </th>
  );
}

export function TableCell({ children, className = '' }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-6 py-4 whitespace-nowrap ${className}`}>
      {children}
    </td>
  );
}
