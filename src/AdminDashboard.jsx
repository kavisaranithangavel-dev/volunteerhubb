import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import Attendance from "./Attendance";

const SKILLS = [
  "General help",
  "First Aid",
  "Driving",
  "Teaching",
  "Cooking",
  "Tech Support",
  "Photography",
];

function fillClass(t) {
  if (t.slotsFilled >= t.slotsNeeded) return "dot green";
  if (t.slotsFilled > 0) return "dot amber";
  return "dot red";
}

function TaskSection({ eventId, tasks }) {
  const [title, setTitle] = useState("");
  const [skill, setSkill] = useState(SKILLS[0]);
  const [slots, setSlots] = useState(1);
  const [error, setError] = useState("");

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await addDoc(collection(db, "tasks"), {
        eventId,
        title,
        requiredSkill: skill,
        slotsNeeded: Number(slots),
        slotsFilled: 0,
        status: "open",
        createdAt: Date.now(),
      });
      setTitle("");
      setSlots(1);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="task-section">
      <h5>Tasks ({tasks.length})</h5>

      {tasks.length === 0 && <p className="muted">No tasks yet.</p>}
      {tasks.map((t) => (
        <div className="task-row" key={t.id}>
          <div>
            <span className={fillClass(t)}></span>
            <b>{t.title}</b>
            <span className="muted">
              {" "}
              · needs {t.requiredSkill} · {t.slotsFilled}/{t.slotsNeeded} filled
            </span>
          </div>
          <button
            className="small danger"
            onClick={() => deleteDoc(doc(db, "tasks", t.id))}
          >
            Remove
          </button>
        </div>
      ))}

      <form className="task-form" onSubmit={handleAdd}>
        <input
          placeholder="Task (e.g. Pack food boxes)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <select value={skill} onChange={(e) => setSkill(e.target.value)}>
          {SKILLS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          max="100"
          value={slots}
          onChange={(e) => setSlots(e.target.value)}
          title="Volunteers needed"
          required
        />
        <button type="submit">Add task</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default function AdminDashboard({ user }) {
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubEvents = onSnapshot(
      query(collection(db, "events"), orderBy("createdAt", "desc")),
      (snap) => setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => setError(err.message)
    );
    const unsubTasks = onSnapshot(
      collection(db, "tasks"),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => a.createdAt - b.createdAt);
        setTasks(list);
      },
      (err) => setError(err.message)
    );
    const unsubAssign = onSnapshot(
      collection(db, "assignments"),
      (snap) => setAssignments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => setError(err.message)
    );
    const unsubVols = onSnapshot(
      query(collection(db, "users"), where("role", "==", "volunteer")),
      (snap) => setVolunteers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => setError(err.message)
    );
    return () => {
      unsubEvents();
      unsubTasks();
      unsubAssign();
      unsubVols();
    };
  }, []);

  const pending = assignments.filter((a) => a.status === "applied");
  const approved = assignments.filter((a) => a.status === "approved");
  const openSlots = tasks.reduce(
    (sum, t) => sum + Math.max(0, t.slotsNeeded - t.slotsFilled),
    0
  );

  async function approve(a) {
    setError("");
    const task = tasks.find((t) => t.id === a.taskId);
    if (!task) {
      setError("That task no longer exists.");
      return;
    }
    if (task.slotsFilled >= task.slotsNeeded) {
      setError(`"${task.title}" is already full.`);
      return;
    }
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "assignments", a.id), {
        status: "approved",
        approvedAt: Date.now(),
      });
      batch.update(doc(db, "tasks", task.id), {
        slotsFilled: increment(1),
        status: task.slotsFilled + 1 >= task.slotsNeeded ? "filled" : "open",
      });
      await batch.commit();
    } catch (err) {
      setError(err.message);
    }
  }

  async function reject(a) {
    setError("");
    try {
      await updateDoc(doc(db, "assignments", a.id), { status: "rejected" });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await addDoc(collection(db, "events"), {
        title,
        description,
        location,
        date,
        createdBy: user.uid,
        createdAt: Date.now(),
      });
      setTitle("");
      setDescription("");
      setLocation("");
      setDate("");
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (window.confirm("Delete this event and its tasks?")) {
      const eventTasks = tasks.filter((t) => t.eventId === id);
      for (const t of eventTasks) {
        await deleteDoc(doc(db, "tasks", t.id));
      }
      await deleteDoc(doc(db, "events", id));
    }
  }

  return (
    <div className="page">
      <h2>Organizer Dashboard</h2>
      {error && <p className="error">{error}</p>}

      <div className="stats">
        <div className="stat">
          <b>{volunteers.length}</b>
          <span>Volunteers</span>
        </div>
        <div className="stat">
          <b>{openSlots}</b>
          <span>Open slots</span>
        </div>
        <div className="stat">
          <b>{pending.length}</b>
          <span>Pending</span>
        </div>
        <div className="stat">
          <b>{approved.length}</b>
          <span>Approved</span>
        </div>
      </div>

      <div className="panel">
        <h3>Applications waiting for approval ({pending.length})</h3>
        {pending.length === 0 && (
          <p className="muted">No pending applications right now.</p>
        )}
        {pending.map((a) => {
          const task = tasks.find((t) => t.id === a.taskId);
          const ev = events.find((e) => e.id === a.eventId);
          const vol = volunteers.find((v) => v.id === a.volunteerId);
          const matches =
            vol && task && (vol.skills || []).includes(task.requiredSkill);
          return (
            <div className="task-row" key={a.id}>
              <div>
                <b>{a.volunteerName}</b>
                <span className="muted">
                  {" "}
                  applied for {task ? task.title : "a removed task"}
                  {ev ? ` · ${ev.title}` : ""}
                </span>
                {matches && <span className="match"> ✓ skill match</span>}
              </div>
              <div className="actions">
                <button className="small apply" onClick={() => approve(a)}>
                  Approve
                </button>
                <button className="small danger" onClick={() => reject(a)}>
                  Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <Attendance assignments={assignments} tasks={tasks} events={events} />
      <form className="panel" onSubmit={handleCreate}>
        <h3>Create a new event</h3>
        <input
          placeholder="Event title (e.g. Food Drive)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <textarea
          placeholder="Description"
          rows="3"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Create event"}
        </button>
      </form>

      <h3>Your events ({events.length})</h3>
      {events.length === 0 && (
        <p className="muted">No events yet. Create your first one above.</p>
      )}
      {events.map((ev) => (
        <div className="panel" key={ev.id}>
          <div className="event-head">
            <div>
              <h4>{ev.title}</h4>
              <p className="muted">
                {ev.date} · {ev.location}
              </p>
              {ev.description && <p>{ev.description}</p>}
            </div>
            <button className="danger" onClick={() => handleDelete(ev.id)}>
              Delete
            </button>
          </div>
          <TaskSection
            eventId={ev.id}
            tasks={tasks.filter((t) => t.eventId === ev.id)}
          />
        </div>
      ))}
    </div>
  );
}