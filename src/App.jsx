import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import AuthPage from "./AuthPage";

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        setProfile(snap.exists() ? snap.data() : null);
      } else {
        setProfile(null);
      }
      setChecking(false);
    });
    return unsub;
  }, []);

  if (checking) return <p className="center">Loading...</p>;
  if (!user) return <AuthPage />;

  return (
    <div className="center">
      <h1>Welcome, {profile ? profile.name : user.email}!</h1>
      <p>Your role: <b>{profile ? profile.role : "unknown"}</b></p>
      <button onClick={() => signOut(auth)}>Log out</button>
    </div>
  );
}