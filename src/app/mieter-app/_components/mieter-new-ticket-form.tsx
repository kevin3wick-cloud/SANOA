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
  const [isUrgent, setIsUrgent] = useState(false);
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

    setPending(true);
    const formData = new FormData();
    formData.set("category", category);
    formData.set("location", location);
    formData.set("file", file);
    if (description.trim()) {
      formData.set("description", description.trim());
    }
    if (isUrgent) {
      formData.set("isUrgent", "true");
    }

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
          Kurzbeschreibung (optional)
        </label>
        <textarea
          id="mieter-desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Was ist passiert?"
          disabled={pending}
        />
      </div>

      <label
        className="muted"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 14,
          cursor: "pointer"
        }}
      >
        <input
          type="checkbox"
          checked={isUrgent}
          onChange={(e) => setIsUrgent(e.target.checked)}
          disabled={pending}
          style={{ width: "auto" }}
        />
        Dringend
      </label>

      <button type="submit" disabled={pending}>
        {pending ? "Wird gesendet …" : "Anfrage absenden"}
      </button>
      {error && <p className="muted">{error}</p>}
    </form>
  );
}
