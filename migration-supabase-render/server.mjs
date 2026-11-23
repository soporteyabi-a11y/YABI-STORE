import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import {createClient} from '@supabase/supabase-js';
import 'dotenv/config';

const app = express();
const port = Number(process.env.PORT) || 4000;

const allowedOrigins = (
  process.env.ALLOWED_ORIGIN || 'http://localhost:3000,http://localhost:5173'
)
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      const normalizedOrigin = origin ? origin.replace(/\/+$/, '') : '';
      if (!normalizedOrigin || allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origen no permitido por CORS'));
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({limit: '1mb'}));

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const hasValidSupabaseUrl = /^https?:\/\/.+/i.test(supabaseUrl);

let supabaseAdmin = null;
let supabaseInitError = null;

if (hasValidSupabaseUrl && serviceRoleKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {autoRefreshToken: false, persistSession: false},
    });
  } catch (err) {
    supabaseInitError = err instanceof Error ? err.message : 'Error inicializando Supabase';
  }
}

async function requireAdminUser(req, res, next) {
  if (!supabaseAdmin) {
    return res.status(503).json({
      error: supabaseInitError || 'Supabase no configurado en Render (revisa SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY)',
    });
  }
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
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

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'yabi-store-render-api',
    health: '/health',
    supabaseConfigured: Boolean(supabaseAdmin),
  });
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'yabi-store-render-api',
    supabaseConfigured: Boolean(supabaseAdmin),
    ...(supabaseInitError ? {initError: supabaseInitError} : {}),
  });
});

// Equivalente a Cloud Function createEmployeeAccount
app.post('/api/employees', requireAdminUser, async (req, res) => {
  try {
    const {email, password, nombre, rol, empresaId} = req.body || {};
    const validRoles = ['admin', 'vendedor', 'bodega'];
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof nombre !== 'string' ||
      !validRoles.includes(rol) ||
      password.length < 6
    ) {
      return res.status(400).json({error: 'Datos de empleado inválidos o incompletos'});
    }
    const targetEmpresa =
      req.yabiUser.rol === 'superadmin' && typeof empresaId === 'string' && empresaId.trim()
        ? empresaId.trim()
        : req.yabiUser.empresa_id;

    const {data: created, error: createErr} = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      return res.status(400).json({error: createErr?.message || 'Error creando cuenta'});
    }

    const {error: insertErr} = await supabaseAdmin.from('usuarios').insert({
      uid: created.user.id,
      empresa_id: targetEmpresa,
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
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
    const targetUid = String(req.params.uid || '').trim();
    if (!targetUid) {
      return res.status(400).json({error: 'UID requerido'});
    }
    if (targetUid === req.yabiUser.uid) {
      return res.status(400).json({error: 'No puedes eliminar tu propia cuenta'});
    }

    if (req.yabiUser.rol !== 'superadmin') {
      const {data: targetProfile} = await supabaseAdmin
        .from('usuarios')
        .select('empresa_id')
        .eq('uid', targetUid)
        .single();
      if (!targetProfile || targetProfile.empresa_id !== req.yabiUser.empresa_id) {
        return res.status(403).json({error: 'No autorizado para eliminar este empleado'});
      }
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

// Envío de correos transaccionales vía Resend API
app.post('/api/emails/send', requireAdminUser, async (req, res) => {
  const {to, subject, html} = req.body || {};
  if (typeof to !== 'string' || !to.includes('@') || typeof subject !== 'string' || !subject.trim()) {
    return res.status(400).json({error: 'Destinatario y asunto válidos requeridos'});
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
      to: [to.trim()],
      subject: subject.trim(),
      html: typeof html === 'string' && html.trim() ? html : `<p>${subject.trim()}</p>`,
    }),
  });
  const data = await resp.json();
  res.status(resp.ok ? 200 : 502).json(data);
});

// Firma de integridad SHA-256 para checkout Wompi Colombia
app.post('/api/wompi/signature', (req, res) => {
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
  const {reference, amountInCents, currency = 'COP'} = req.body || {};
  if (!integritySecret) {
    return res.status(503).json({error: 'WOMPI_INTEGRITY_SECRET no configurado'});
  }
  if (
    typeof reference !== 'string' ||
    !reference.trim() ||
    !Number.isInteger(amountInCents) ||
    amountInCents <= 0
  ) {
    return res.status(400).json({error: 'Referencia y monto en centavos válidos requeridos'});
  }
  const raw = `${reference.trim()}${amountInCents}${String(currency)}${integritySecret}`;
  const signature = crypto.createHash('sha256').update(raw).digest('hex');
  res.json({signature});
});

app.listen(port, '0.0.0.0', () => {
  console.log(`YA'BI Store Render API escuchando en puerto ${port}`);
});
