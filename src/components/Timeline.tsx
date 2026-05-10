interface Event {
  date: string
  title: string
  desc?: string
}

interface Props {
  events: Event[]
}

export function Timeline({ events }: Props) {
  return (
    <div className="timeline">
      {events.map((ev, i) => (
        <div key={i} className="timeline-item">
          <div className="timeline-spine">
            <div className="timeline-dot" />
            {i < events.length - 1 && <div className="timeline-connector" />}
          </div>
          <div className="timeline-body">
            <div className="timeline-date">{ev.date}</div>
            <div className="timeline-title">{ev.title}</div>
            {ev.desc && <div className="timeline-desc">{ev.desc}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}
