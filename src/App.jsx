import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";
import AuthPage from "./AuthPage";
import AdminDashboard from "./AdminDashboard";
import VolunteerDashboard from "./VolunteerDashboard";

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let unsubProfile = null;

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }
      if (u) {
        unsubProfile = onSnapshot(doc(db, "users", u.uid), (snap) => {
          setProfile(snap.exists() ? snap.data() : null);
          setChecking(false);
        });
      } else {
        setProfile(null);
        setChecking(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  if (checking) return <p className="center">Loading...</p>;
  if (!user) return <AuthPage />;

  if (!profile) {
    return (
      <div className="center">
        <p>Loading your profile...</p>
        <button onClick={() => signOut(auth)}>Log out</button>
      </div>
    );
  }

  return (
    <div>
      <header className="topbar">
        <span className="brand">VolunteerHub</span>
        <span>
          {profile.name} ({profile.role}){" "}
          <button className="small" onClick={() => signOut(auth)}>
            Log out
          </button>
        </span>
      </header>

      {profile.role === "admin" ? (
        <AdminDashboard user={user} />
      ) : (
        <VolunteerDashboard user={user} profile={profile} />
      )}
    </div>
  );
}