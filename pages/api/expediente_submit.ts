import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

function isEmpty(value: any) {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

const ALLOWED_FIELDS = new Set<string>([
  // A
  "nif_entidad",
  "comunidad_autonoma",
  "provincia_",
  "calle_actuacion",

  // C
  "nombre_representante",
  "nif_representante",
  "correo_representante",
  "telefono_representante",
  "presidente_comunidad",
  "fecha_inicio",
  "fecha_fin",

  // D
  "acta_junta",

  // E rehab
  "ayuda_rehab",
  "ent_ayuda",
  "año_ayuda",
  "regul_ayuda",
  "estado_ayuda",
  "fecha_resolucion",
  "resol_ayuda",
  "cuantia_ayuda",

  // E bis
  "ayuda_bisrehab",
  "ent_bisayudabis",
  "ano_bisayuda",
  "regul_bisayuda",
  "num_bisexp",
  "estado_bisayuda",
  "fecha_bisresolucion",
  "resol_bisayuda",
  "cuantia_bisayuda",
]);

const NUMBER_FIELDS = new Set<string>(["cuantia_ayuda", "cuantia_bisayuda", "ano_bisayuda"]);
const BOOL_FIELDS = new Set<string>(["ayuda_bisrehab"]);

function toNumberSafe(v: any) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  const normalized = s.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function toBoolSafe(v: any) {
  if (typeof v === "boolean") return v;
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  if (["si", "sí", "true", "1", "on", "yes"].includes(s)) return true;
  if (["no", "false", "0", "off"].includes(s)) return false;
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = String(req.body?.token || "");
  const data = req.body?.data as Record<string, any> | undefined;

  if (!token) return res.status(400).json({ error: "Missing token" });
  if (!data || typeof data !== "object") return res.status(400).json({ error: "Missing data" });

  const { data: tokenRow, error: tokenErr } = await supabaseAdmin
    .from("expediente_tokens")
    .select("token, expediente_id, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  if (tokenErr) return res.status(500).json({ error: tokenErr.message });
  if (!tokenRow) return res.status(404).json({ error: "Invalid token" });
  if (tokenRow.used_at) return res.status(410).json({ error: "Link already used" });
  if (new Date(tokenRow.expires_at).getTime() < Date.now()) return res.status(410).json({ error: "Link expired" });

  const { data: expediente, error: expErr } = await supabaseAdmin
    .from("expedientes_ae")
    .select("*")
    .eq("id_", tokenRow.expediente_id)
    .maybeSingle();

  if (expErr) return res.status(500).json({ error: expErr.message });
  if (!expediente) return res.status(404).json({ error: "Expediente not found" });

  const updateData: Record<string, any> = {};

  for (const [key, raw] of Object.entries(data)) {
    if (!ALLOWED_FIELDS.has(key)) continue;

    let v: any = raw;
    if (typeof v === "string") v = v.trim();
    if (isEmpty(v)) continue;

    if (NUMBER_FIELDS.has(key)) {
      const n = toNumberSafe(v);
      if (n === null) continue;
      v = n;
    }

    if (BOOL_FIELDS.has(key)) {
      const b = toBoolSafe(v);
      if (b === null) continue;
      v = b;
    }

    const currentValue = (expediente as any)[key];
    if (isEmpty(currentValue)) updateData[key] = v;
  }

  if (Object.keys(updateData).length > 0) {
    const { error: updErr } = await supabaseAdmin
      .from("expedientes_ae")
      .update(updateData)
      .eq("id_", tokenRow.expediente_id);

    if (updErr) return res.status(500).json({ error: updErr.message });
  }

  const { error: markErr } = await supabaseAdmin
    .from("expediente_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  if (markErr) return res.status(500).json({ error: markErr.message });

  return res.status(200).json({ ok: true, updated: Object.keys(updateData) });
}
