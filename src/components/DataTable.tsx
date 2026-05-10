import { useState, useMemo } from 'react'

interface Props {
  columns: string[]
  data: string[][]
  sortable?: boolean
}

export function DataTable({ columns, data, sortable = false }: Props) {
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const rows = useMemo(() => {
    if (sortCol === null || !sortable) return data
    return [...data].sort((a, b) => {
      const cmp = String(a[sortCol] ?? '').localeCompare(String(b[sortCol] ?? ''), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortable, sortCol, sortDir])

  const handleSort = (i: number) => {
    if (!sortable) return
    if (sortCol === i) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(i)
      setSortDir('asc')
    }
  }

  return (
    <div className="datatable-wrapper">
      <table className="datatable">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className={`${sortable ? 'sortable' : ''} ${sortCol === i ? 'sorted' : ''}`}
                onClick={() => handleSort(i)}
              >
                {col}
                {sortable && sortCol === i && (
                  <span className="sort-indicator">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => <td key={ci}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
