import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

type Field = {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "email" | "tel" | "textarea";
};

// Campos BIS
const BIS_FIELDS = new Set([
  "ayuda_bisrehab",
  "ent_bisayudabis",
  "ano_bisayuda",
  "regul_bisayuda",
  "num_expbisayuda",
  "estado_bisayuda",
  "fecha_solbisayuda",
  "fecha_bisresolucion",
  "cuantia_bisayuda",
]);

// Campos AYUDA (rehab)
const AYUDA_FIELDS = new Set([
  "ayuda_rehab",
  "ent_ayuda",
  "año_ayuda",
  "regul_ayuda",
  "num_expayuda",
  "estado_ayuda",
  "fecha_solayuda",
  "fecha_resolucion",
  "cuantia_ayuda",
]);

function isBisField(name: string) {
  return BIS_FIELDS.has(name);
}

function isAyudaField(name: string) {
  return AYUDA_FIELDS.has(name);
}

function isTextArea(type: Field["type"]) {
  return type === "textarea";
}

export default function ExpedientePage() {
  const router = useRouter();
  const token = useMemo(
    () => (typeof router.query.token === "string" ? router.query.token : ""),
    [router.query.token]
  );

  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "info" | "error" | "success"; text: string } | null>(null);

  // 🔘 Switches
  const [hasAyuda, setHasAyuda] = useState(false);
  const [hasBis, setHasBis] = useState(false);

  // valores del formulario
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!token) return;

    (async () => {
      setLoading(true);
      setMsg(null);

      const res = await fetch(`/api/expediente?token=${encodeURIComponent(token)}`);
      const json = await res.json();

      if (!res.ok) {
        setFields([]);
        setMsg({ type: "error", text: json?.error || "No se pudo cargar el formulario." });
        setLoading(false);
        return;
      }

      const f: Field[] = json.fields || [];
      setFields(f);

      // Auto-activar switches si ya hay campos de ayuda/bis pendientes en el JSON
      // (así el usuario lo ve directo si toca rellenarlo)
      const hasAyudaPending = f.some((x) => isAyudaField(x.name));
      const hasBisPending = f.some((x) => isBisField(x.name));

      setHasAyuda(false);          // si hay campos de ayuda pendientes, lo ponemos ON
      setHasBis(false); // BIS solo si hay ayuda + campos BIS pendientes

      setLoading(false);
    })();
  }, [token]);

  function setValue(name: string, v: any) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  // Campos visibles según switches:
  // - Base (A/C/D) siempre visibles (son los que no son AYUDA ni BIS)
  // - AYUDA solo si hasAyuda
  // - BIS solo si hasAyuda && hasBis
  const visibleFields = useMemo(() => {
    return fields.filter((f) => {
      if (isBisField(f.name)) return hasAyuda && hasBis;
      if (isAyudaField(f.name)) return hasAyuda;
      return true; // A/C/D
    });
  }, [fields, hasAyuda, hasBis]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setMsg({ type: "info", text: "Enviando…" });

    const data: Record<string, any> = {};

    // ✅ Guardamos el flag BIS (si no hay ayuda, BIS debe ir a false)
    // (Esto cuadra con tu columna bool ayuda_bisrehab)
    data["ayuda_bisrehab"] = hasAyuda ? hasBis : false;

    // Solo enviamos campos que el usuario ve (según switches)
    for (const f of visibleFields) {
      const v = values[f.name];

      if (v === null || v === undefined) continue;
      if (typeof v === "string" && v.trim() === "") continue;

      data[f.name] = typeof v === "string" ? v.trim() : v;
    }

    const res = await fetch("/api/expediente_submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, data }),
    });

    const json = await res.json();

    if (!res.ok) {
      setMsg({ type: "error", text: json?.error || "Error al guardar." });
      setSubmitting(false);
      return;
    }

    setMsg({ type: "success", text: "✅ Datos enviados correctamente. Ya puedes cerrar esta página." });
    setSubmitting(false);
  }

  // Estilos tipo “bonito” como tu captura
  const styles = {
    page: {
      minHeight: "100vh",
      background: "#f5f5f5",
      padding: "32px 16px",
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif',
      color: "#111827",
    } as const,
    header: {
      maxWidth: 920,
      margin: "0 auto 18px auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    } as const,
    brand: { display: "flex", alignItems: "center", gap: 10 } as const,
    logo: { width: 36, height: 36, borderRadius: 999, background: "#111827" } as const,
    brandText: { lineHeight: 1.1 } as const,
    brandTitle: { fontWeight: 700, fontSize: 14 } as const,
    brandSub: { fontSize: 12, color: "#6b7280" } as const,

    container: { maxWidth: 920, margin: "0 auto" } as const,
    pill: {
      display: "inline-block",
      border: "1px solid #e5e7eb",
      borderRadius: 999,
      padding: "6px 12px",
      fontSize: 12,
      color: "#374151",
      background: "#fff",
      marginBottom: 10,
    } as const,
    h1: { fontSize: 34, margin: "8px 0 6px 0" } as const,
    p: { margin: 0, color: "#6b7280" } as const,

    card: {
      marginTop: 18,
      background: "#fff",
      borderRadius: 18,
      border: "1px solid #e5e7eb",
      padding: 22,
    } as const,

    alert: (type: "info" | "error" | "success") =>
      ({
        marginTop: 12,
        borderRadius: 12,
        padding: "12px 14px",
        fontSize: 14,
        border: "1px solid",
        background:
          type === "success" ? "#ecfdf5" : type === "error" ? "#fef2f2" : "#f9fafb",
        borderColor:
          type === "success" ? "#a7f3d0" : type === "error" ? "#fecaca" : "#e5e7eb",
        color: type === "success" ? "#065f46" : type === "error" ? "#991b1b" : "#374151",
      }) as const,

    twoCol: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
    } as const,

    field: { display: "grid", gap: 8 } as const,
    label: { fontSize: 13, color: "#111827", fontWeight: 600 } as const,
    input: {
      width: "100%",
      borderRadius: 14,
      border: "1px solid #e5e7eb",
      padding: "12px 14px",
      fontSize: 14,
      outline: "none",
      background: "#fff",
    } as const,
    help: { fontSize: 12, color: "#6b7280" } as const,

    toggleBox: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      border: "1px solid #e5e7eb",
      borderRadius: 14,
      padding: "12px 14px",
      background: "#fff",
      marginTop: 8,
    } as const,

    switch: (on: boolean) =>
      ({
        width: 46,
        height: 26,
        borderRadius: 999,
        background: on ? "#111827" : "#e5e7eb",
        position: "relative",
        transition: "all .2s ease",
        cursor: "pointer",
        flexShrink: 0,
      }) as const,
    knob: (on: boolean) =>
      ({
        width: 22,
        height: 22,
        borderRadius: 999,
        background: "#fff",
        position: "absolute",
        top: 2,
        left: on ? 22 : 2,
        transition: "all .2s ease",
      }) as const,

    sectionTitle: { marginTop: 16, fontWeight: 800, fontSize: 14 } as const,
    sectionHint: { marginTop: 4, fontSize: 12, color: "#6b7280" } as const,

    button: (disabled: boolean) =>
      ({
        marginTop: 14,
        width: "100%",
        borderRadius: 14,
        padding: "12px 16px",
        fontSize: 14,
        fontWeight: 700,
        border: "none",
        background: "#111827",
        color: "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
      }) as const,
    footer: { marginTop: 12, fontSize: 12, color: "#6b7280" } as const,
  };

  function helpText(f: Field) {
    if (f.type === "date") return "Formato: AAAA-MM-DD";
    if (f.type === "number") return "Puedes usar decimales.";
    return " ";
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logo} />
          <div style={styles.brandText}>
            <div style={styles.brandTitle}>Caeconsultores</div>
            <div style={styles.brandSub}>Portal de documentación</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>Enlace personal y temporal</div>
      </div>

      <div style={styles.container}>
        <div style={styles.pill}>Documentación del expediente</div>
        <h1 style={styles.h1}>Completar datos pendientes</h1>
        <p style={styles.p}>Rellena únicamente los campos solicitados.</p>

        <div style={styles.card}>
          {!token && <div style={styles.alert("error")}>Token no válido.</div>}
          {loading && <div style={styles.alert("info")}>Cargando…</div>}
          {!loading && msg && <div style={styles.alert(msg.type)}>{msg.text}</div>}

          {!loading && !msg && fields.length === 0 && (
            <div style={styles.alert("success")}>✅ Este expediente ya tiene toda la información necesaria.</div>
          )}

          {!loading && fields.length > 0 && (
            <form onSubmit={handleSubmit}>
              {/* TOGGLE AYUDA */}
              <div style={styles.toggleBox}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>¿Hay alguna ayuda/subvención?</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Si la activas, aparecerán los campos de la ayuda.
                  </div>
                </div>

                <div
                  role="switch"
                  aria-checked={hasAyuda}
                  tabIndex={0}
                  onClick={() => {
                    setHasAyuda((v) => {
                      const next = !v;
                      if (!next) setHasBis(false); // si apagas ayuda, apaga BIS también
                      return next;
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setHasAyuda((v) => {
                        const next = !v;
                        if (!next) setHasBis(false);
                        return next;
                      });
                    }
                  }}
                  style={styles.switch(hasAyuda)}
                >
                  <div style={styles.knob(hasAyuda)} />
                </div>
              </div>

              {/* TOGGLE BIS: solo si hay AYUDA */}
              {hasAyuda && (
                <div style={styles.toggleBox}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>¿Hay una segunda ayuda?</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      Si la activas, aparecerán los campos de la segunda ayuda.
                    </div>
                  </div>

                  <div
                    role="switch"
                    aria-checked={hasBis}
                    tabIndex={0}
                    onClick={() => setHasBis((v) => !v)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setHasBis((v) => !v);
                    }}
                    style={styles.switch(hasBis)}
                  >
                    <div style={styles.knob(hasBis)} />
                  </div>
                </div>
              )}

              <div style={{ marginTop: 14 }}>
                <div style={styles.twoCol}>
                  {visibleFields.map((f) => {
                    const colSpan2 = isTextArea(f.type);
                    return (
                      <div key={f.name} style={{ ...styles.field, gridColumn: colSpan2 ? "1 / -1" : "auto" }}>
                        <label htmlFor={f.name} style={styles.label}>
                          {f.label}
                        </label>

                        {f.type === "textarea" ? (
                          <textarea
                            id={f.name}
                            name={f.name}
                            rows={4}
                            disabled={submitting}
                            value={values[f.name] ?? ""}
                            onChange={(e) => setValue(f.name, e.target.value)}
                            style={styles.input}
                          />
                        ) : (
                          <input
                            id={f.name}
                            name={f.name}
                            type={f.type}
                            step={f.type === "number" ? "any" : undefined}
                            disabled={submitting}
                            value={values[f.name] ?? ""}
                            onChange={(e) => setValue(f.name, e.target.value)}
                            style={styles.input}
                          />
                        )}

                        <div style={styles.help}>{helpText(f)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button type="submit" disabled={submitting} style={styles.button(submitting)}>
                {submitting ? "Enviando…" : "Enviar"}
              </button>

              <div style={styles.footer}>
                Si tienes dudas, responde al mismo correo/WhatsApp desde el que recibiste el enlace.
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
