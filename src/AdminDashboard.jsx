import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "./firebase";

const SKILLS = [
  "General help",
  "First Aid",
  "Driving",
  "Teaching",
  "Cooking",
  "Tech Support",
  "Photography",
];

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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => setError(err.message)
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "tasks"),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => a.createdAt - b.createdAt);
        setTasks(list);
      },
      (err) => setError(err.message)
    );
    return unsub;
  }, []);

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
        {error && <p className="error">{error}</p>}
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