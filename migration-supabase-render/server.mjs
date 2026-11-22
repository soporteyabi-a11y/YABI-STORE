import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import {createClient} from '@supabase/supabase-js';
import 'dotenv/config';

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors({origin: process.env.ALLOWED_ORIGIN || '*'}));
app.use(express.json({limit: '1mb'}));

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {autoRefreshToken: false, persistSession: false},
      })
    : null;

async function requireAdminUser(req, res, next) {
  if (!supabaseAdmin) {
    return res.status(503).json({error: 'Supabase no configurado en Render'});
  }
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({error: 'Token requerido'});
  }
  const {data: authData, error} = await supabaseAdmin.auth.getUser(token);
  if (error || !authData.user) {
    return res.status(401).json({error: 'Sesión inválida'});
  }
  const {data: profile} = await supabaseAdmin
    .from('usuarios')
    .select('rol, empresa_id')
    .eq('uid', authData.user.id)
    .single();
  if (!profile || !['admin', 'superadmin'].includes(profile.rol)) {
    return res.status(403).json({error: 'Se requiere rol de administrador'});
  }
  req.yabiUser = {uid: authData.user.id, ...profile};
  next();
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'yabi-store-render-api',
    supabaseConfigured: Boolean(supabaseAdmin),
  });
});

// Equivalente a Cloud Function createEmployeeAccount
app.post('/api/employees', requireAdminUser, async (req, res) => {
  try {
    const {email, password, nombre, rol, empresaId} = req.body;
    if (!email || !password || !nombre || !rol) {
      return res.status(400).json({error: 'Campos obligatorios incompletos'});
    }
    const targetEmpresa =
      req.yabiUser.rol === 'superadmin' && empresaId ? empresaId : req.yabiUser.empresa_id;

    const {data: created, error: createErr} = await supabaseAdmin.auth.admin.createUser({
      email: String(email).trim(),
      password: String(password),
      email_confirm: true,
    });
    if (createErr || !created.user) {
      return res.status(400).json({error: createErr?.message || 'Error creando cuenta'});
    }

    const {error: insertErr} = await supabaseAdmin.from('usuarios').insert({
      uid: created.user.id,
      empresa_id: targetEmpresa,
      nombre: String(nombre).trim(),
      email: String(email).trim(),
      rol,
    });
    if (insertErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      return res.status(400).json({error: insertErr.message});
    }

    res.status(201).json({uid: created.user.id});
  } catch (err) {
    res.status(500).json({error: err instanceof Error ? err.message : 'Error interno'});
  }
});

// Equivalente a Cloud Function deleteUserAccount
app.delete('/api/employees/:uid', requireAdminUser, async (req, res) => {
  try {
    const targetUid = req.params.uid;
    if (targetUid === req.yabiUser.uid) {
      return res.status(400).json({error: 'No puedes eliminar tu propia cuenta'});
    }
    const {error} = await supabaseAdmin.auth.admin.deleteUser(targetUid);
    if (error) {
      return res.status(400).json({error: error.message});
    }
    res.json({deleted: true, uid: targetUid});
  } catch (err) {
    res.status(500).json({error: err instanceof Error ? err.message : 'Error interno'});
  }
});

// Envío de correos transaccionales vía Resend API (si RESEND_API_KEY está configurada)
app.post('/api/emails/send', requireAdminUser, async (req, res) => {
  const {to, subject, html} = req.body;
  if (!to || !subject) {
    return res.status(400).json({error: 'Destinatario y asunto requeridos'});
  }
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return res.json({
      queued: false,
      message: 'RESEND_API_KEY no configurada; correo registrado solo en bitácora.',
    });
  }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'YA’BI Store <notificaciones@yabistore.co>',
      to: [to],
      subject,
      html: html || `<p>${subject}</p>`,
    }),
  });
  const data = await resp.json();
  res.status(resp.ok ? 200 : 502).json(data);
});

// Firma de integridad SHA-256 para checkout Wompi Colombia
app.post('/api/wompi/signature', (req, res) => {
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
  const {reference, amountInCents, currency = 'COP'} = req.body;
  if (!integritySecret) {
    return res.status(503).json({error: 'WOMPI_INTEGRITY_SECRET no configurado'});
  }
  const raw = `${reference}${amountInCents}${currency}${integritySecret}`;
  const signature = crypto.createHash('sha256').update(raw).digest('hex');
  res.json({signature});
});

app.listen(port, () => {
  console.log(`YA'BI Store Render API escuchando en puerto ${port}`);
});
