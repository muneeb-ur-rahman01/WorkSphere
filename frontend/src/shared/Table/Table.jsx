
import React from 'react';

const Table = ({
  headers = [],
  data = [],
  renderRow,
  emptyMessage = 'No records found.',
}) => {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          {/* Table Header */}
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {headers.map((header, index) => (
                <th
                  key={index}
                  className={`
                    whitespace-nowrap
                    px-5 py-4
                    text-left
                    text-[11px]
                    font-bold
                    uppercase
                    tracking-wider
                    text-slate-500
                    ${index === 0 ? 'pl-8' : ''}
                    ${index === headers.length - 1 ? 'pr-8' : ''}
                  `}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100">
            {data.length > 0 ? (
              data.map((item, index) => (
                <React.Fragment key={item?.id ?? index}>
                  {renderRow(item, index)}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td
                  colSpan={headers.length || 1}
                  className="px-6 py-0 text-center"
                >
                  <div className="flex min-h-[240px] flex-col items-center justify-center">
                    {/* Empty State Icon */}
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
                      <svg
                        width="25"
                        height="25"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M9 12h6M9 16h4M8 3h8l4 4v14H4V3h4Z"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>

                    <p className="text-sm font-bold text-slate-800">
                      {emptyMessage}
                    </p>

                    <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
                      There are no records available to display at the moment.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
