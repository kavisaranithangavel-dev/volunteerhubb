export default function MyHours({ profile, myApps, tasks }) {
  const completed = myApps.filter((a) => a.status === "completed");
  const total = Number(profile.totalHours || 0);

  const taskName = (id) => {
    const t = tasks.find((x) => x.id === id);
    return t ? t.title : "Removed task";
  };

  return (
    <div className="panel">
      <h3>My hours</h3>
      <div className="big-hours">{total.toFixed(2)} hours volunteered</div>
      {completed.length === 0 && (
        <p className="muted">Completed shifts will show up here.</p>
      )}
      {completed.map((a) => (
        <div className="task-row" key={a.id}>
          <div>
            <b>{taskName(a.taskId)}</b>
            <span className="muted"> · {a.hoursWorked} h</span>
          </div>
          <span className="muted">
            {new Date(a.checkOutTime).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
}