"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Droplets,
  Flame,
  Zap,
  DoorOpen,
  Home,
  HelpCircle,
  Bath,
  UtensilsCrossed,
  Sofa,
  BedDouble,
  Archive,
  Users,
  type LucideProps,
} from "lucide-react";
import React from "react";
import {
  MIETER_TICKET_CATEGORIES,
  MIETER_TICKET_LOCATIONS,
} from "@/mieter-app/options";
import { type TicketCategory } from "@prisma/client";

type IconComponent = (props: LucideProps) => React.ReactElement;

const CATEGORY_ICONS: Record<TicketCategory, IconComponent> = {
  SANITAER: (p) => <Droplets {...p} />,
  HEIZUNG: (p) => <Flame {...p} />,
  ELEKTRO: (p) => <Zap {...p} />,
  FENSTER_TUEREN: (p) => <DoorOpen {...p} />,
  ALLGEMEIN: (p) => <Home {...p} />,
  SONSTIGES: (p) => <HelpCircle {...p} />,
};

const CATEGORY_DESC: Record<TicketCategory, string> = {
  SANITAER: "Wasser, WC, Abfluss",
  HEIZUNG: "Heizkörper, Thermostat",
  ELEKTRO: "Strom, Licht, Steckdose",
  FENSTER_TUEREN: "Fenster, Türen, Schloss",
  ALLGEMEIN: "Allgemeine Schäden",
  SONSTIGES: "Anderes",
};

const LOCATION_ICONS: Record<string, IconComponent> = {
  Bad: (p) => <Bath {...p} />,
  Küche: (p) => <UtensilsCrossed {...p} />,
  Wohnzimmer: (p) => <Sofa {...p} />,
  Schlafzimmer: (p) => <BedDouble {...p} />,
  Keller: (p) => <Archive {...p} />,
  Gemeinschaftsraum: (p) => <Users {...p} />,
  Sonstiges: (p) => <HelpCircle {...p} />,
};

function IconCard({
  label,
  desc,
  icon,
  selected,
  onSelect,
  accent,
}: {
  label: string;
  desc?: string;
  icon: IconComponent;
  selected: boolean;
  onSelect: () => void;
  accent?: string;
}) {
  const color = accent ?? "#2563eb";
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: desc ? "14px 8px" : "12px 8px",
        borderRadius: 12,
        cursor: "pointer",
        border: `2px solid ${selected ? color : "var(--border, #e5e7eb)"}`,
        background: selected ? color + "0d" : "transparent",
        textAlign: "center",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <input
        type="radio"
        style={{ display: "none" }}
        checked={selected}
        onChange={onSelect}
      />
      {icon({
        size: 22,
        strokeWidth: 1.75,
        color: selected ? color : "var(--muted, #6b7280)",
        style: { transition: "color 0.15s" },
      })}
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.2,
          color: selected ? color : "inherit",
        }}
      >
        {label}
      </span>
      {desc && (
        <span
          style={{
            fontSize: 10,
            color: "var(--muted, #9ca3af)",
            lineHeight: 1.3,
          }}
        >
          {desc}
        </span>
      )}
    </label>
  );
}

export function MieterNewTicketForm() {
  const router = useRouter();
  const [category, setCategory] = useState<TicketCategory | "">("");
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
      setError(
        "Bitte eine Kurzbeschreibung mit mindestens 3 Zeichen eingeben."
      );
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
        credentials: "include",
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
      {/* ── Kategorie ── */}
      <div className="stack" style={{ gap: 8 }}>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--muted, #6b7280)",
          }}
        >
          Kategorie
          <span style={{ color: "var(--accent, #2563eb)", marginLeft: 2 }}>
            *
          </span>
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
          }}
        >
          {MIETER_TICKET_CATEGORIES.map((c) => (
            <IconCard
              key={c.value}
              label={c.label}
              desc={CATEGORY_DESC[c.value]}
              icon={CATEGORY_ICONS[c.value]}
              selected={category === c.value}
              onSelect={() => setCategory(c.value)}
            />
          ))}
        </div>
      </div>

      {/* ── Ort ── */}
      <div className="stack" style={{ gap: 8 }}>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--muted, #6b7280)",
          }}
        >
          Ort
          <span style={{ color: "var(--accent, #2563eb)", marginLeft: 2 }}>
            *
          </span>
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
          }}
        >
          {MIETER_TICKET_LOCATIONS.map((l) => {
            const icon = LOCATION_ICONS[l.value] ?? ((p: LucideProps) => <HelpCircle {...p} />);
            return (
              <IconCard
                key={l.value}
                label={l.label}
                icon={icon}
                selected={location === l.value}
                onSelect={() => setLocation(l.value)}
              />
            );
          })}
        </div>
      </div>

      {/* ── Foto ── */}
      <div className="stack" style={{ gap: 6 }}>
        <label
          className="muted"
          htmlFor="mieter-photo"
          style={{ fontSize: 13 }}
        >
          Foto vom Schaden{" "}
          <span style={{ color: "var(--accent)" }}>*</span>
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

      {/* ── Beschreibung ── */}
      <div className="stack" style={{ gap: 6 }}>
        <label
          className="muted"
          htmlFor="mieter-desc"
          style={{ fontSize: 13 }}
        >
          Kurzbeschreibung{" "}
          <span style={{ color: "var(--accent)" }}>*</span>
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
