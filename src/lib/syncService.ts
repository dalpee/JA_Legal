import {
  getRealSupabaseClient,
  getSupabaseConfig,
  getStoredCases,
  saveStoredCases,
  getStoredFinances,
  saveStoredFinances,
  fetchAllCasesFromDatabase,
  fetchAllFinancesFromDatabase,
  syncAllLocalDataToSupabase,
} from "./supabaseClient";
import { CaseRecord, FinancialRecord, DocumentItem } from "../types/portal";

export type ConnectionState = "connected" | "syncing" | "reconnecting" | "offline";

export interface SyncStatusInfo {
  state: ConnectionState;
  lastSyncTime: Date | null;
  channelActive: boolean;
  syncedCasesCount: number;
  syncedFinancesCount: number;
  error: string | null;
}

type SyncListeners = {
  onCasesUpdated?: (cases: CaseRecord[]) => void;
  onFinancesUpdated?: (finances: FinancialRecord[]) => void;
  onStatusChanged?: (status: SyncStatusInfo) => void;
};

let activeListeners: SyncListeners[] = [];
let heartbeatTimer: any = null;
let realtimeChannel: any = null;
let isSyncingInProgress = false;

let currentStatus: SyncStatusInfo = {
  state: "offline",
  lastSyncTime: null,
  channelActive: false,
  syncedCasesCount: 0,
  syncedFinancesCount: 0,
  error: null,
};

function notifyStatus(partial: Partial<SyncStatusInfo>) {
  currentStatus = { ...currentStatus, ...partial };
  activeListeners.forEach((l) => l.onStatusChanged?.(currentStatus));
}

/**
 * Realiza una sincronización bidireccional inmediata con Supabase
 */
export async function performFullSync(): Promise<{ success: boolean; casesCount: number; financesCount: number }> {
  if (isSyncingInProgress) {
    return {
      success: true,
      casesCount: currentStatus.syncedCasesCount,
      financesCount: currentStatus.syncedFinancesCount,
    };
  }

  const cfg = getSupabaseConfig();
  if (!cfg.isConfigured) {
    notifyStatus({ state: "offline", channelActive: false, error: "Credenciales de Supabase no configuradas" });
    return { success: false, casesCount: 0, financesCount: 0 };
  }

  isSyncingInProgress = true;
  notifyStatus({ state: "syncing", error: null });

  try {
    const client = getRealSupabaseClient();

    // Obtener los casos y finanzas reales directamente de Supabase
    const finalCases = await fetchAllCasesFromDatabase();
    const finalFinances = await fetchAllFinancesFromDatabase();

    // Notificar a los componentes React
    activeListeners.forEach((l) => {
      l.onCasesUpdated?.(finalCases);
      l.onFinancesUpdated?.(finalFinances);
    });

    notifyStatus({
      state: "connected",
      lastSyncTime: new Date(),
      syncedCasesCount: finalCases.length,
      syncedFinancesCount: finalFinances.length,
      error: null,
    });

    return { success: true, casesCount: finalCases.length, financesCount: finalFinances.length };
  } catch (err: any) {
    console.warn("Error durante la sincronización con Supabase", err);
    notifyStatus({
      state: "reconnecting",
      error: err.message || "Error al sincronizar con Supabase",
    });
    return { success: false, casesCount: 0, financesCount: 0 };
  } finally {
    isSyncingInProgress = false;
  }
}

/**
 * Inicia la suscripción a canales Realtime de Supabase
 */
function setupRealtimeChannel() {
  const cfg = getSupabaseConfig();
  if (!cfg.isConfigured) return;

  try {
    const client = getRealSupabaseClient();
    if (!client || typeof client.channel !== "function") return;

    if (realtimeChannel) {
      client.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }

    const channel = client.channel("ja-legal-continuous-sync");

    // Escuchar cambios en la tabla 'cases'
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "cases" },
      async (payload: any) => {
        console.info("⚡ Cambio en tiempo real detectado en 'cases':", payload.eventType);
        const updated = await fetchAllCasesFromDatabase();
        activeListeners.forEach((l) => l.onCasesUpdated?.(updated));
        notifyStatus({ lastSyncTime: new Date(), syncedCasesCount: updated.length });
      }
    );

    // Escuchar cambios en la tabla 'financial_records'
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "financial_records" },
      async (payload: any) => {
        console.info("⚡ Cambio en tiempo real detectado en 'financial_records':", payload.eventType);
        const updated = await fetchAllFinancesFromDatabase();
        activeListeners.forEach((l) => l.onFinancesUpdated?.(updated));
        notifyStatus({ lastSyncTime: new Date(), syncedFinancesCount: updated.length });
      }
    );

    // Escuchar cambios en documentos
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "documents" },
      (payload: any) => {
        console.info("⚡ Cambio en tiempo real detectado en 'documents':", payload.eventType);
        notifyStatus({ lastSyncTime: new Date() });
      }
    );

    channel.subscribe((status: string) => {
      console.info("🛰️ Estado del canal Realtime Supabase:", status);
      if (status === "SUBSCRIBED") {
        notifyStatus({ channelActive: true, state: "connected" });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        notifyStatus({ channelActive: false, state: "reconnecting" });
      }
    });

    realtimeChannel = channel;
  } catch (e) {
    console.warn("No se pudo iniciar canal Realtime de Supabase", e);
    notifyStatus({ channelActive: false });
  }
}

/**
 * Tarea de fondo continua que mantiene la base de datos siempre conectada
 * y actualizada en cualquier momento.
 * - Sincroniza al iniciar.
 * - Mantiene canal Realtime activo.
 * - Heartbeat cada 15 segundos para auto-reconexión y refresco.
 * - Escucha eventos de ventana 'focus' y 'online' para sincronización inmediata.
 */
export function startContinuousDatabaseTask(listeners: SyncListeners): () => void {
  activeListeners.push(listeners);

  // Iniciar la primera sincronización y canal
  performFullSync();
  setupRealtimeChannel();

  // Heartbeat cada 15 segundos
  if (!heartbeatTimer) {
    heartbeatTimer = setInterval(() => {
      performFullSync();
    }, 15000);
  }

  // Evento cuando la pestaña vuelve a tener foco
  const handleFocus = () => {
    console.info("Ventana activa: ejecutando sincronización con Supabase...");
    performFullSync();
  };

  // Evento cuando la conexión a Internet se restablece
  const handleOnline = () => {
    console.info("Red conectada: restableciendo canal y sincronizando con Supabase...");
    setupRealtimeChannel();
    performFullSync();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
  }

  return () => {
    activeListeners = activeListeners.filter((l) => l !== listeners);
    if (activeListeners.length === 0) {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleFocus);
        window.removeEventListener("online", handleOnline);
      }
    }
  };
}

export function getCurrentSyncStatus(): SyncStatusInfo {
  return currentStatus;
}
