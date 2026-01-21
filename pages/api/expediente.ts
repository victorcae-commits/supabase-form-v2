import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

type FieldType = "text" | "number" | "date" | "email" | "tel" | "textarea";

const EDITABLE_FIELDS: Array<{ name: string; label: string; type: FieldType }> = [
  // A
  { name: "nif_entidad", label: "NIF de la entidad", type: "text" },
  { name: "comunidad_autonoma", label: "Comunidad autónoma", type: "text" },
  { name: "provincia_", label: "Provincia", type: "text" },
  { name: "calle_actuacion", label: "Dirección de la actuación", type: "text" },

  // C
  { name: "nombre_representante", label: "Nombre del firmante del contrato", type: "text" },
  { name: "nif_representante", label: "NIF del firmante del contrato", type: "text" },
  { name: "correo_representante", label: "Correo del representante", type: "email" },
  { name: "telefono_representante", label: "Teléfono del representante", type: "tel" },
  


  // D
  { name: "acta_junta", label: "Acta de la junta (nombre del archivo)", type: "textarea" },

  // E – rehab
  { name: "ayuda_rehab", label: "Denominacion del programa de ayuda (rehabilitación)", type: "text" },
  { name: "ent_ayuda", label: "Entidad u organismo gestor", type: "text" },
  { name: "año_ayuda", label: "Año de la ayuda", type: "text" },
  { name: "regul_ayuda", label: "Disposicion reguladora", type: "text" },
  { name: "num_expayuda", label: "Número de expediente", type: "text" },
  { name: "estado_ayuda", label: "Estado de la concesion", type: "text" },
  { name: "fecha_solayuda", label: "Fecha de solicitud", type: "date" },
  { name: "fecha_resolucion", label: "Fecha de resolución", type: "date" },
  { name: "cuantia_ayuda", label: "Cuantía concedida (€)", type: "number" },

  // E – bis
  { name: "ayuda_bisrehab", label: "Denominacion del programa de ayuda (BIS) (rehabilitación)", type: "text" },
  { name: "ent_bisayudabis", label: "Organismo concedente (BIS)", type: "text" },
  { name: "ano_bisayuda", label: "Año (BIS)", type: "number" },
  { name: "regul_bisayuda", label: "Convocatoria / base reguladora (BIS)", type: "text" },
  { name: "num_expbisayuda", label: "Número de expediente (BIS)", type: "text" },
  { name: "estado_bisayuda", label: "Estado (BIS)", type: "text" },
  { name: "fecha_solbisayuda", label: "Fecha de solicitud (BIS)", type: "date" },
  { name: "fecha_bisresolucion", label: "Fecha de resolución (BIS)", type: "date" },
  { name: "cuantia_bisayuda", label: "Cuantía concedida (BIS) €", type: "number" },
];

function isEmpty(value: any) {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = String(req.query.token || "");
  if (!token) return res.status(400).json({ error: "Missing token" });

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

  const fields = EDITABLE_FIELDS.filter((f) => isEmpty((expediente as any)[f.name]));
  return res.status(200).json({ expediente_id: expediente.id_, fields });
}

