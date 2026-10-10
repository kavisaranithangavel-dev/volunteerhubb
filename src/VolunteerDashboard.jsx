import { useEffect, useState } from "react";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import MyHours from "./MyHours";
const SKILLS = [
  "General help",
  "First Aid",
  "Driving",
  "Teaching",
  "Cooking",
  "Tech Support",
  "Photography",
];

const STATUS_LABEL = {
  applied: "Pending approval",
  approved: "Approved",
  rejected: "Not selected",
  "checked-in": "Checked in - working now",
  completed: "Completed",
};

export default function VolunteerDashboard({ user, profile }) {
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubEvents = onSnapshot(
      collection(db, "events"),
      (snap) => setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => setError(err.message)
    );
    const unsubTasks = onSnapshot(
      collection(db, "tasks"),
      (snap) => setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => setError(err.message)
    );
    const unsubApps = onSnapshot(
      query(collection(db, "assignments"), where("volunteerId", "==", user.uid)),
      (snap) => setMyApps(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => setError(err.message)
    );
    return () => {
      unsubEvents();
      unsubTasks();
      unsubApps();
    };
  }, [user.uid]);

  const mySkills = profile.skills || [];

  async function toggleSkill(skill) {
    await updateDoc(doc(db, "users", user.uid), {
      skills: mySkills.includes(skill) ? arrayRemove(skill) : arrayUnion(skill),
    });
  }

  function appFor(taskId) {
    return myApps.find((a) => a.taskId === taskId);
  }

  async function apply(task) {
    setError("");
    try {
      await addDoc(collection(db, "assignments"), {
        taskId: task.id,
        eventId: task.eventId,
        volunteerId: user.uid,
        volunteerName: profile.name,
        status: "applied",
        appliedAt: Date.now(),
      });
    } catch (err) {
      setError(err.message);
    }
  }

  async function withdraw(appId) {
    await deleteDoc(doc(db, "assignments", appId));
  }

  const taskById = (id) => tasks.find((t) => t.id === id);
  const eventById = (id) => events.find((e) => e.id === id);

  return (
    <div className="page">
      <h2>Hi, {profile.name}!</h2>
      {error && <p className="error">{error}</p>}

      <div className="panel">
        <h3>My skills</h3>
        <p className="muted">Tap the skills you have. We use them to match you with tasks.</p>
        <div className="chips">
          {SKILLS.map((s) => (
            <span
              key={s}
              className={mySkills.includes(s) ? "chip on" : "chip"}
              onClick={() => toggleSkill(s)}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>My applications ({myApps.length})</h3>
        {myApps.length === 0 && <p className="muted">You haven't applied to any tasks yet.</p>}
        {myApps.map((a) => {
          const t = taskById(a.taskId);
          const ev = eventById(a.eventId);
          return (
            <div className="task-row" key={a.id}>
              <div>
                <b>{t ? t.title : "Task removed"}</b>
                <span className="muted">
                  {" "}
                  · {ev ? ev.title : ""} · {STATUS_LABEL[a.status] || a.status}
                </span>
              </div>
              {a.status === "applied" && (
                <button className="small danger" onClick={() => withdraw(a.id)}>
                  Withdraw
                </button>
              )}
            </div>
          );
        })}
      </div>
      <MyHours profile={profile} myApps={myApps} tasks={tasks} />
      <h3>Open events</h3>
      {events.length === 0 && <p className="muted">No events yet. Check back soon.</p>}
      {events.map((ev) => {
        const evTasks = tasks.filter((t) => t.eventId === ev.id);
        return (
          <div className="panel" key={ev.id}>
            <h4>{ev.title}</h4>
            <p className="muted">
              {ev.date} · {ev.location}
            </p>
            {ev.description && <p>{ev.description}</p>}
            {evTasks.length === 0 && <p className="muted">No tasks posted yet.</p>}
            {evTasks.map((t) => {
              const mine = appFor(t.id);
              const full = t.slotsFilled >= t.slotsNeeded;
              return (
                <div className="task-row" key={t.id}>
                  <div>
                    <b>{t.title}</b>
                    <span className="muted">
                      {" "}
                      · {t.requiredSkill} · {t.slotsFilled}/{t.slotsNeeded} filled
                    </span>
                    {mySkills.includes(t.requiredSkill) && (
                      <span className="match"> ✓ matches your skills</span>
                    )}
                  </div>
                  {mine ? (
                    <span className="muted">{STATUS_LABEL[mine.status]}</span>
                  ) : full ? (
                    <span className="muted">Full</span>
                  ) : (
                    <button className="small apply" onClick={() => apply(t)}>
                      Apply
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}