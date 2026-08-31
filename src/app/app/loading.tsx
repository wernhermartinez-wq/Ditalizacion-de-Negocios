export default function Loading() {
  return <main className="page-content"><div className="page-heading"><div><div className="skeleton" style={{ width: "8rem", height: ".7rem", marginBottom: ".8rem" }} /><div className="skeleton" style={{ width: "min(80vw, 34rem)", height: "2.4rem" }} /></div></div><div className="dashboard-grid">{Array.from({ length: 6 }, (_, index) => <div key={index} className="card skeleton" style={{ gridColumn: "span 4", minHeight: "12rem" }} />)}</div></main>;
}
