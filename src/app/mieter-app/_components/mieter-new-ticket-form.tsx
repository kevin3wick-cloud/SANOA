"use client";

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, type LucideIcon } from "lucide-react";
import { ROOMS, type Room, type SubItem } from "@/mieter-app/ticket-wizard-options";

// ── Icon card ─────────────────────────────────────────────────────────────────

function IconCard({
  label,
  Icon,
  selected,
  onSelect,
  compact,
}: {
  label: string;
  Icon: LucideIcon;
  selected?: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: compact ? 6 : 8,
        padding: compact ? "12px 6px" : "16px 8px",
        borderRadius: 14,
        cursor: "pointer",
        border: `2px solid ${selected ? "var(--accent)" : "var(--border)"}`,
        background: selected ? "var(--accent-dim)" : "var(--surface)",
        textAlign: "center",
        width: "100%",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <Icon
        size={compact ? 20 : 26}
        strokeWidth={1.5}
        color={selected ? "var(--accent)" : "var(--muted)"}
        style={{ transition: "color 0.15s", flexShrink: 0 }}
      />
      <span
        style={{
          fontSize: compact ? 11 : 12,
          fontWeight: 600,
          lineHeight: 1.3,
          color: selected ? "var(--accent)" : "var(--text)",
        }}
      >
        {label}
      </span>
    </button>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 20 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 20 : 8,
            height: 8,
            borderRadius: 4,
            background: i === current ? "var(--accent)" : i < current ? "var(--accent)" + "55" : "var(--border)",
            transition: "width 0.2s, background 0.2s",
          }}
        />
      ))}
    </div>
  );
}

// ── Back button ───────────────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 13,
        color: "var(--muted)",
        padding: "4px 0",
        marginBottom: 8,
        width: "auto",
      }}
    >
      <ChevronLeft size={16} strokeWidth={1.75} />
      Zurück
    </button>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

type Step = "room" | "item" | "details";

export function MieterNewTicketForm() {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<Step>("room");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedItem, setSelectedItem] = useState<SubItem | null>(null);
  const [customRoom, setCustomRoom] = useState("");

  // Step 3: details
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [brand, setBrand] = useState("");
  const [serial, setSerial] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  // Total steps: room has items → 3 steps, else → 2 steps
  const hasItemStep = selectedRoom
    ? !!(selectedRoom.items && selectedRoom.items.length > 0) || !!selectedRoom.custom
    : true;
  const totalSteps = hasItemStep ? 3 : 2;
  const currentStepIndex = step === "room" ? 0 : step === "item" ? 1 : totalSteps - 1;

  // ── Handlers ──────────────────────────────────────────────────────────────

  function pickRoom(room: Room) {
    setSelectedRoom(room);
    setSelectedItem(null);
    setCustomRoom("");
    setError("");
    if (room.items && room.items.length > 0) {
      setStep("item");
    } else if (room.custom) {
      setStep("item"); // shows text input
    } else {
      // direct to details
      setStep("details");
    }
  }

  function pickItem(item: SubItem) {
    setSelectedItem(item);
    setError("");
    setStep("details");
  }

  function goBack() {
    setError("");
    if (step === "details") {
      if (hasItemStep) {
        setStep("item");
      } else {
        setSelectedRoom(null);
        setStep("room");
      }
    } else if (step === "item") {
      setSelectedRoom(null);
      setStep("room");
    }
  }

  // Build the location string
  function buildLocation(): string {
    const roomLabel = selectedRoom?.custom ? customRoom || selectedRoom.label : selectedRoom?.label ?? "";
    if (selectedItem) return `${roomLabel} – ${selectedItem.label}`;
    return roomLabel;
  }

  // Category: from sub-item, or ALLGEMEIN for direct rooms
  function buildCategory(): string {
    return selectedItem?.category ?? "ALLGEMEIN";
  }

  const isAppliance = selectedItem?.isAppliance === true;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!selectedRoom) { setError("Bitte einen Raum wählen."); return; }
    if (selectedRoom.custom && !customRoom.trim()) { setError("Bitte den Raum benennen."); return; }
    if (selectedRoom.items?.length && !selectedItem) { setError("Bitte ein Element wählen."); return; }
    if (!file) { setError("Bitte ein Foto hochladen."); return; }
    if (description.trim().length < 3) { setError("Bitte eine Beschreibung eingeben (min. 3 Zeichen)."); return; }

    setPending(true);
    const formData = new FormData();
    formData.set("category", buildCategory());
    formData.set("location", buildLocation());
    formData.set("file", file);

    let desc = description.trim();
    if (isAppliance && (brand.trim() || serial.trim())) {
      const extra: string[] = [];
      if (brand.trim()) extra.push(`Marke: ${brand.trim()}`);
      if (serial.trim()) extra.push(`Seriennummer: ${serial.trim()}`);
      desc = `${desc}\n\n${extra.join(" · ")}`;
    }
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <StepDots current={currentStepIndex} total={totalSteps} />

      {/* ── Step 1: Room ── */}
      {step === "room" && (
        <div>
          <p style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Wo liegt das Problem?
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {ROOMS.map((room) => (
              <IconCard
                key={room.id}
                label={room.label}
                Icon={room.icon}
                onSelect={() => pickRoom(room)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: Sub-item ── */}
      {step === "item" && selectedRoom && (
        <div>
          <BackButton onClick={goBack} />
          <p style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {selectedRoom.label} – Was genau?
          </p>

          {/* Custom room: text input */}
          {selectedRoom.custom && (
            <div className="stack" style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Raum beschreiben (z. B. Büro, Garage…)"
                value={customRoom}
                onChange={(e) => setCustomRoom(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                disabled={!customRoom.trim()}
                onClick={() => { if (customRoom.trim()) setStep("details"); }}
                style={{ opacity: customRoom.trim() ? 1 : 0.4 }}
              >
                Weiter
              </button>
            </div>
          )}

          {/* Sub-item grid */}
          {selectedRoom.items && selectedRoom.items.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {selectedRoom.items.map((item) => (
                <IconCard
                  key={item.id}
                  label={item.label}
                  Icon={item.icon}
                  compact
                  onSelect={() => pickItem(item)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Details ── */}
      {step === "details" && (
        <form className="stack" onSubmit={onSubmit}>
          <BackButton onClick={goBack} />

          {/* Summary pill */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 999,
            background: "var(--accent-dim)", color: "var(--accent)",
            fontSize: 13, fontWeight: 600, alignSelf: "flex-start",
          }}>
            {selectedRoom && <selectedRoom.icon size={14} strokeWidth={1.75} />}
            {buildLocation()}
          </div>

          {/* Appliance fields */}
          {isAppliance && (
            <div style={{ background: "var(--bg-elevated)", borderRadius: 10, padding: "14px", border: "1px solid var(--border)" }}>
              <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Gerät (optional)
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input
                  type="text"
                  placeholder="Marke (z. B. Bosch)"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Seriennummer"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Photo */}
          <div className="stack" style={{ gap: 6 }}>
            <label className="muted" htmlFor="mieter-photo" style={{ fontSize: 13 }}>
              Foto vom Problem <span style={{ color: "var(--accent)" }}>*</span>
            </label>
            <input
              id="mieter-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={pending}
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Description */}
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
          {error && <p className="muted" style={{ color: "#f87171", margin: 0 }}>{error}</p>}
        </form>
      )}
    </div>
  );
}
