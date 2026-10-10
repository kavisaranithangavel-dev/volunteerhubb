import { useState } from "react";
import { doc, increment, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

export default function Attendance({ assignments, tasks, events }) {
  const [error, setError] = useState("");

  const active = assignments.filter(
    (a) => a.status === "approved" || a.status === "checked-in"
  );
  const done = assignments.filter((a) => a.status === "completed");
  const checkedInCount = assignments.filter(
    (a) => a.status === "checked-in"
  ).length;

  const taskName = (id) => {
    const t = tasks.find((x) => x.id === id);
    return t ? t.title : "Removed task";
  };
  const eventName = (id) => {
    const e = events.find((x) => x.id === id);
    return e ? e.title : "";
  };

  async function checkIn(a) {
    setError("");
    try {
      await updateDoc(doc(db, "assignments", a.id), {
        status: "checked-in",
        checkInTime: Date.now(),
      });
    } catch (err) {
      setError(err.message);
    }
  }

  async function checkOut(a) {
    setError("");
    try {
      const now = Date.now();
      const hours = Math.round(((now - a.checkInTime) / 3600000) * 100) / 100;
      const batch = writeBatch(db);
      batch.update(doc(db, "assignments", a.id), {
        status: "completed",
        checkOutTime: now,
        hoursWorked: hours,
      });
      batch.update(doc(db, "users", a.volunteerId), {
        totalHours: increment(hours),
      });
      await batch.commit();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="panel">
      <h3>Attendance · {checkedInCount} checked in now</h3>
      {error && <p className="error">{error}</p>}

      {active.length === 0 && (
        <p className="muted">
          No approved volunteers yet. Approve an application first.
        </p>
      )}
      {active.map((a) => (
        <div className="task-row" key={a.id}>
          <div>
            <span className={a.status === "checked-in" ? "dot green" : "dot amber"}></span>
            <b>{a.volunteerName}</b>
            <span className="muted">
              {" "}
              · {taskName(a.taskId)} · {eventName(a.eventId)}
              {a.status === "checked-in" &&
                ` · in since ${new Date(a.checkInTime).toLocaleTimeString()}`}
            </span>
          </div>
          {a.status === "approved" ? (
            <button className="small apply" onClick={() => checkIn(a)}>
              Check in
            </button>
          ) : (
            <button className="small danger" onClick={() => checkOut(a)}>
              Check out
            </button>
          )}
        </div>
      ))}

      {done.length > 0 && (
        <>
          <h4>Completed shifts ({done.length})</h4>
          {done.map((a) => (
            <div className="task-row" key={a.id}>
              <div>
                <b>{a.volunteerName}</b>
                <span className="muted">
                  {" "}
                  · {taskName(a.taskId)} · {a.hoursWorked} h
                </span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}