import React, { useState } from "react";
import { performFullSync, SyncStatusInfo } from "../lib/syncService";
import { syncAllLocalDataToSupabase } from "../lib/supabaseClient";
import { RefreshCw, Database, CheckCircle2, AlertCircle } from "./icons";

interface SupabaseLiveSyncBarProps {
  syncStatus: SyncStatusInfo;
  onOpenSqlModal?: () => void;
}

export function SupabaseLiveSyncBar({ syncStatus, onOpenSqlModal }: SupabaseLiveSyncBarProps) {
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isPushingAll, setIsPushingAll] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    setMessage(null);
    try {
      const res = await performFullSync();
      if (res.success) {
        setMessage(`¡Sincronizado! ${res.casesCount} casos y ${res.financesCount} registros actualizados.`);
      } else {
        setMessage("Sincronización completada con datos locales.");
      }
    } catch {
      setMessage("Error al conectar.");
    } finally {
      setIsManualSyncing(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handlePushAllToSupabase = async () => {
    setIsPushingAll(true);
    setMessage(null);
    try {
      const res = await syncAllLocalDataToSupabase();
      setMessage(`🚀 ${res.casesCount} casos y ${res.financesCount} finanzas subidos con éxito a Supabase.`);
      await performFullSync();
    } catch (err: any) {
      setMessage(`Aviso: ${err.message || "Error al subir a Supabase"}`);
    } finally {
      setIsPushingAll(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const isConnected = syncStatus.state === "connected";
  const isSyncing = syncStatus.state === "syncing" || isManualSyncing;

  const formatLastSync = (d: Date | null) => {
    if (!d) return "Pendiente";
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 5) return "Justo ahora";
    if (diffSec < 60) return `Hace ${diffSec}s`;
    return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div
      style={{
        background: "linear-gradient(90deg, rgba(16, 24, 39, 0.95), rgba(15, 23, 42, 0.95))",
        borderBottom: "1px solid rgba(56, 189, 248, 0.2)",
        padding: "8px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
        fontSize: "0.8rem",
        color: "#e2e8f0",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
      }}
    >
      {/* Estado y URL */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              backgroundColor: isConnected ? "#10b981" : isSyncing ? "#f59e0b" : "#64748b",
              boxShadow: isConnected ? "0 0 10px #10b981" : "none",
              animation: isSyncing ? "pulse 1.5s infinite" : "none",
            }}
          />
          <strong style={{ color: "#f8fafc", letterSpacing: "0.02em" }}>
            {isConnected ? "Supabase Conectado en Tiempo Real" : isSyncing ? "Sincronizando con Supabase..." : "Supabase Offline"}
          </strong>
        </div>

        <span
          style={{
            background: "rgba(56, 189, 248, 0.12)",
            color: "#38bdf8",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            padding: "2px 8px",
            borderRadius: "4px",
            fontFamily: "monospace",
            fontSize: "0.75rem",
          }}
        >
          emvnqsigrfthqopwnveh.supabase.co
        </span>

        {syncStatus.channelActive && (
          <span
            style={{
              background: "rgba(16, 185, 129, 0.15)",
              color: "#34d399",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "0.7rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            ⚡ WebSocket Activo
          </span>
        )}

        <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
          Última actualización: <strong>{formatLastSync(syncStatus.lastSyncTime)}</strong>
        </span>

        {message && (
          <span
            style={{
              color: message.includes("Error") ? "#f87171" : "#34d399",
              fontWeight: 600,
              padding: "2px 8px",
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: "4px",
              animation: "fadeIn 0.3s ease",
            }}
          >
            {message}
          </span>
        )}
      </div>

      {/* Botones de acción */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          type="button"
          onClick={handleManualSync}
          disabled={isSyncing}
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            color: "#f1f5f9",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "0.75rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            cursor: isSyncing ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
          }}
          title="Fuerza una actualización inmediata con la base de datos de Supabase"
        >
          <span
            style={{
              display: "inline-block",
              animation: isSyncing ? "spin 1s linear infinite" : "none",
            }}
          >
            <RefreshCw size={12} color="#38bdf8" />
          </span>
          <span>{isSyncing ? "Actualizando..." : "Sincronizar ahora"}</span>
        </button>

        <button
          type="button"
          onClick={handlePushAllToSupabase}
          disabled={isPushingAll}
          style={{
            background: "rgba(16, 185, 129, 0.15)",
            color: "#6ee7b7",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "0.75rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            cursor: isPushingAll ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
          title="Guarda todos los casos y registros financieros actuales en tu panel de Supabase"
        >
          <Database size={12} color="#10b981" />
          <span>{isPushingAll ? "Guardando en Supabase..." : "Cargar Casos a Supabase"}</span>
        </button>

        {onOpenSqlModal && (
          <button
            type="button"
            onClick={onOpenSqlModal}
            style={{
              background: "transparent",
              color: "#cbd5e1",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "0.72rem",
              cursor: "pointer",
            }}
          >
            Script SQL
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-3px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
