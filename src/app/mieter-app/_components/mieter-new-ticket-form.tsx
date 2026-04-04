"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MIETER_TICKET_CATEGORIES,
  MIETER_TICKET_LOCATIONS
} from "@/mieter-app/options";

export function MieterNewTicketForm() {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!category || !location) {
      setError("Bitte Kategorie und Ort wählen.");
      return;
    }

    if (!file) {
      setError("Bitte ein Foto hochladen (Pflichtfeld).");
      return;
    }

    const desc = description.trim();
    if (desc.length < 3) {
      setError("Bitte eine Kurzbeschreibung mit mindestens 3 Zeichen eingeben.");
      return;
    }

    setPending(true);
    const formData = new FormData();
    formData.set("category", category);
    formData.set("location", location);
    formData.set("file", file);
    formData.set("description", desc);

    try {
      const response = await fetch("/api/mieter-app/tickets", {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      const data = (await response.json()) as { id?: string; error?: string };

      if (!response.ok) {
        setError(data.error ?? "Anfrage konnte nicht gesendet werden.");
        setPending(false);
        return;
      }

      router.push("/mieter-app/tickets");
      router.refresh();
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <div className="stack" style={{ gap: 6 }}>
        <label className="muted" htmlFor="mieter-cat" style={{ fontSize: 13 }}>
          Kategorie
        </label>
        <select
          id="mieter-cat"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={pending}
        >
          <option value="">Bitte wählen …</option>
          {MIETER_TICKET_CATEGORIES.map((c) => (
            <option value={c.value} key={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <label className="muted" htmlFor="mieter-loc" style={{ fontSize: 13 }}>
          Ort
        </label>
        <select
          id="mieter-loc"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={pending}
        >
          <option value="">Bitte wählen …</option>
          {MIETER_TICKET_LOCATIONS.map((l) => (
            <option value={l.value} key={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <label className="muted" htmlFor="mieter-photo" style={{ fontSize: 13 }}>
          Foto vom Schaden <span style={{ color: "var(--accent)" }}>*</span>
        </label>
        <input
          id="mieter-photo"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          capture="environment"
          disabled={pending}
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <label className="muted" htmlFor="mieter-desc" style={{ fontSize: 13 }}>
          Kurzbeschreibung <span style={{ color: "var(--accent)" }}>*</span>
        </label>
        <textarea
          id="mieter-desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Was ist passiert?"
          disabled={pending}
          required
          minLength={3}
        />
      </div>

      <button type="submit" disabled={pending}>
        {pending ? "Wird gesendet …" : "Anfrage absenden"}
      </button>
      {error && <p className="muted">{error}</p>}
    </form>
  );
}
