"use client";

import { FormEvent, useState } from "react";
import { DocumentKind } from "@prisma/client";
import { useRouter } from "next/navigation";
import { formatDocumentKind } from "@/lib/format";

type TenantOption = {
  id: string;
  name: string;
};

type DocumentUploadFormProps = {
  tenants: TenantOption[];
};

export function DocumentUploadForm({ tenants }: DocumentUploadFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [tenantId, setTenantId] = useState("");
  const [kind, setKind] = useState<DocumentKind>(DocumentKind.SONSTIGES);
  const [visibility, setVisibility] = useState("TENANT_VISIBLE");
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);

  function onFileChange(list: FileList | null) {
    const next = list?.[0] ?? null;
    setFile(next);
    setFeedback("");
    if (next && !name.trim()) {
      setName(next.name.replace(/\.pdf$/i, "").trim());
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");

    if (!file) {
      setFeedback("Bitte eine PDF-Datei auswählen.");
      return;
    }

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".pdf")) {
      setFeedback("Nur PDF-Dateien sind erlaubt.");
      return;
    }

    if (!name.trim()) {
      setFeedback("Bitte einen Dokumentnamen eingeben.");
      return;
    }

    setPending(true);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("name", name.trim());
    formData.set("visibility", visibility);
    formData.set("kind", kind);
    if (tenantId) {
      formData.set("tenantId", tenantId);
    }

    try {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setFeedback(data.error ?? "Dokument konnte nicht hochgeladen werden.");
        setPending(false);
        return;
      }

      setName("");
      setFile(null);
      setTenantId("");
      setKind(DocumentKind.SONSTIGES);
      setVisibility("TENANT_VISIBLE");
      setFeedback("Dokument wurde hochgeladen.");
      const input = document.getElementById("document-pdf-input") as HTMLInputElement | null;
      if (input) input.value = "";
      router.refresh();
    } catch {
      setFeedback("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
        Standardmäßig sind neue Dokumente <strong>für Mieter sichtbar</strong>. Nur bei internen
        Unterlagen „Nur intern“ wählen – diese erscheinen dann nicht im Mieter-Portal.
      </p>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Anzeigename (Titel)"
      />
      <div className="stack" style={{ gap: 6 }}>
        <label className="muted" htmlFor="document-pdf-input" style={{ fontSize: 13 }}>
          PDF-Datei
        </label>
        <input
          id="document-pdf-input"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => onFileChange(e.target.files)}
          disabled={pending}
        />
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <label className="muted" htmlFor="document-tenant-select" style={{ fontSize: 13 }}>
          Zuordnung
        </label>
        <select
          id="document-tenant-select"
          value={tenantId}
          onChange={(event) => setTenantId(event.target.value)}
          disabled={pending}
        >
          <option value="">Alle Mieter</option>
          {tenants.map((tenant) => (
            <option value={tenant.id} key={tenant.id}>
              {tenant.name}
            </option>
          ))}
        </select>
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <label className="muted" htmlFor="document-kind-select" style={{ fontSize: 13 }}>
          Kategorie (Typ)
        </label>
        <select
          id="document-kind-select"
          value={kind}
          onChange={(event) => setKind(event.target.value as DocumentKind)}
          disabled={pending}
        >
          {(Object.values(DocumentKind) as DocumentKind[]).map((k) => (
            <option value={k} key={k}>
              {formatDocumentKind(k)}
            </option>
          ))}
        </select>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
        Bei „Für Mieter sichtbar“ ersetzt ein neues Dokument mit derselben Kategorie und
        Zuordnung die aktuelle Version; die vorherige erscheint im Mieter-Archiv.
      </p>
      <select
        value={visibility}
        onChange={(event) => setVisibility(event.target.value)}
        disabled={pending}
      >
        <option value="INTERNAL">Nur intern</option>
        <option value="TENANT_VISIBLE">Für Mieter sichtbar</option>
      </select>
      <button type="submit" disabled={pending}>
        {pending ? "Wird hochgeladen …" : "PDF hochladen"}
      </button>
      {feedback && <p className="muted">{feedback}</p>}
    </form>
  );
}
