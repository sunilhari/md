import { useState } from 'react'

interface Props {
  label: string
  min?: number
  max?: number
  defaultValue?: number
  unit?: string
  step?: number
}

export function Slider({
  label,
  min = 0,
  max = 100,
  defaultValue = 50,
  unit = '',
  step = 1,
}: Props) {
  const [value, setValue] = useState(defaultValue)

  return (
    <div className="slider-container">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{value}{unit}</span>
      </div>
      <input
        type="range"
        className="slider-input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => setValue(Number(e.target.value))}
      />
      <div className="slider-range">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}
