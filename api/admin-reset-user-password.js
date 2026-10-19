import { createClient } from "@supabase/supabase-js";

const authorizedAdminEmails = new Set([
  "eldavidprz@gmail.com",
  "marlon.jimenez@jalegal.com.co",
  "sebastian.ariza@jalegal.com.co",
  "marlondavidjimenez22@gmail.com",
  "abogadosebastianariza@gmail.com",
  "contacto@jalegal.com.co",
]);

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Método no permitido." });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !anonKey || !adminKey) {
    return response.status(503).json({ error: "Falta configurar Supabase en el servidor de Vercel." });
  }

  const token = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return response.status(401).json({ error: "Inicia sesión para continuar." });

  try {
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user?.email) return response.status(401).json({ error: "La sesión no es válida. Inicia sesión de nuevo." });

    if (!authorizedAdminEmails.has(user.email.toLowerCase())) {
      return response.status(403).json({ error: "Solo los administradores autorizados pueden cambiar contraseñas." });
    }

    const { userId, email, password } = request.body || {};
    if (typeof userId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      return response.status(400).json({ error: "No se encontró un ID válido para esta cuenta." });
    }
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return response.status(400).json({ error: "No se encontró el correo asociado a esta cuenta." });
    }
    if (typeof password !== "string" || password.length < 8 || password.length > 72) {
      return response.status(400).json({ error: "La nueva contraseña debe tener entre 8 y 72 caracteres." });
    }

    const adminClient = createClient(supabaseUrl, adminKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    let { error: updateError } = await adminClient.auth.admin.updateUserById(userId, { password });
    if (updateError?.message.toLowerCase().includes("user not found")) {
      // Algunos perfiles antiguos tienen un UUID de plantilla. Resolver la cuenta Auth
      // por el correo guardado en el perfil y aplicar el cambio al UID verdadero.
      const normalizedEmail = email.trim().toLowerCase();
      let matchingAuthUser = null;
      for (let page = 1; page <= 20 && !matchingAuthUser; page += 1) {
        const { data, error: listError } = await adminClient.auth.admin.listUsers({ page, perPage: 100 });
        if (listError) return response.status(400).json({ error: listError.message });
        matchingAuthUser = data.users.find((candidate) => candidate.email?.toLowerCase() === normalizedEmail) || null;
        if (matchingAuthUser || data.users.length < 100) break;
      }
      if (!matchingAuthUser) {
        return response.status(404).json({ error: "No existe una cuenta de acceso en Supabase Auth con el correo de este perfil." });
      }
      ({ error: updateError } = await adminClient.auth.admin.updateUserById(matchingAuthUser.id, { password }));
    }
    if (updateError) return response.status(400).json({ error: updateError.message });

    return response.status(200).json({ success: true });
  } catch (error) {
    console.error("Error cambiando contraseña de usuario", error);
    return response.status(500).json({ error: "Ocurrió un error al cambiar la contraseña." });
  }
}
