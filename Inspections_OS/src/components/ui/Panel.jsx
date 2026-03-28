export default function Panel({ title, children }) {
  return (
    <div className="card">
      {title ? <div className="label">{title}</div> : null}
      {children}
    </div>
  );
}
