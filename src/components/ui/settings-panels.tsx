"use client";

import { FormEvent, useState } from "react";

type UserRow = {
  id: string;
  name: string;
  email: string;
};

type SettingsPanelsProps = {
  users: UserRow[];
};

export function SettingsPanels({ users }: SettingsPanelsProps) {
  const [companyName, setCompanyName] = useState("Hausverwaltung Muster GmbH");
  const [companyEmail, setCompanyEmail] = useState("hausverwaltung@example.de");
  const [newUser, setNewUser] = useState("");
  const [notifyByMail, setNotifyByMail] = useState(true);
  const [feedback, setFeedback] = useState("");

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyName.trim() || !companyEmail.includes("@")) {
      setFeedback("Bitte gültiges Firmenprofil angeben.");
      return;
    }
    setFeedback("Firmenprofil gespeichert (MVP-Mock).");
  }

  function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newUser.includes("@")) {
      setFeedback("Bitte gültige E-Mail für neuen Benutzer eingeben.");
      return;
    }
    setFeedback(`Benutzer ${newUser} hinzugefügt (MVP-Mock).`);
    setNewUser("");
  }

  return (
    <div className="stack">
      <div className="card">
        <h3>Firmenprofil</h3>
        <form className="stack" onSubmit={saveProfile}>
          <input
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            placeholder="Firmenname"
          />
          <input
            value={companyEmail}
            onChange={(event) => setCompanyEmail(event.target.value)}
            placeholder="Firmen-E-Mail"
          />
          <button type="submit">Profil speichern</button>
        </form>
      </div>

      <div className="card">
        <h3>Benutzerverwaltung</h3>
        <ul>
          {users.map((user) => (
            <li key={user.id}>
              {user.name} - {user.email} (Entfernen: MVP-Mock)
            </li>
          ))}
        </ul>
        <form className="stack" onSubmit={addUser}>
          <input
            value={newUser}
            onChange={(event) => setNewUser(event.target.value)}
            placeholder="Neue Benutzer-E-Mail"
          />
          <button type="submit">Benutzer hinzufügen</button>
        </form>
      </div>

      <div className="card">
        <h3>Benachrichtigungen</h3>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            checked={notifyByMail}
            onChange={(event) => setNotifyByMail(event.target.checked)}
            style={{ width: "auto" }}
          />
          E-Mail bei neuen Tickets senden
        </label>
      </div>

      {feedback && <p className="muted">{feedback}</p>}
    </div>
  );
}
