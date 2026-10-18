import React from "react";
import { DocumentItem, CaseRecord } from "../types/portal";
import { X, Download, FileText } from "./icons";

interface DocumentModalProps {
  document: DocumentItem | null;
  caseRecord: CaseRecord;
  onClose: () => void;
}

export function DocumentModal({ document, caseRecord, onClose }: DocumentModalProps) {
  if (!document) return null;
  const fileUrl = document.download_url;
  const isPdf = Boolean(fileUrl && (fileUrl.startsWith("data:application/pdf") || document.name.toLowerCase().endsWith(".pdf")));
  const isImage = Boolean(fileUrl && (fileUrl.startsWith("data:image/") || /\.(png|jpe?g|gif|webp)$/i.test(document.name)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-slate-100 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
              {document.category} · Expediente Judicial
            </span>
            <h3 className="text-base sm:text-lg font-semibold text-white truncate max-w-md">
              {document.name}
            </h3>
            <p className="text-xs text-slate-400 mt-1">{caseRecord.title} · Radicado: {caseRecord.radicado || caseRecord.id}</p>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 min-h-48 max-h-[60vh] overflow-auto flex items-center justify-center">
          {fileUrl && isPdf ? (
            <iframe title={document.name} src={fileUrl} className="w-full h-[55vh] rounded-lg bg-white" />
          ) : fileUrl && isImage ? (
            <img src={fileUrl} alt={document.name} className="max-w-full max-h-[55vh] object-contain" />
          ) : fileUrl ? (
            <div className="text-center text-slate-300"><FileText className="w-10 h-10 mx-auto mb-3 text-amber-400" /><p>El archivo está listo para descargar.</p></div>
          ) : (
            <div className="text-center text-slate-300">
              <FileText className="w-10 h-10 mx-auto mb-3 text-slate-500" />
              <p className="font-semibold">Este registro no tiene un archivo adjunto.</p>
              <p className="text-xs text-slate-400 mt-2">Solicita al despacho que cargue el documento digital para poder visualizarlo o descargarlo.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <div className="flex items-center gap-4">
            <span>Tamaño: {document.file_size}</span>
            <span>Fecha de subida: {document.uploaded_at}</span>
            <span className="text-amber-400 font-semibold">{document.status}</span>
          </div>

          {fileUrl && <a
            href={fileUrl}
            download={document.name}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer no-underline"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Archivo</span>
          </a>}
        </div>
      </div>
    </div>
  );
}
