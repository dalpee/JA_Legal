import React from "react";
import { DocumentItem, CaseRecord } from "../types/portal";
import { X, Download, FileText, CheckCircle2 } from "./icons";

interface DocumentModalProps {
  document: DocumentItem | null;
  caseRecord: CaseRecord;
  onClose: () => void;
}

export function DocumentModal({ document, caseRecord, onClose }: DocumentModalProps) {
  if (!document) return null;

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
          </div>
        </div>

        {/* Legal Document Mock Viewer Sheet */}
        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800/80 space-y-4 font-serif text-slate-300 text-xs sm:text-sm leading-relaxed max-h-72 overflow-y-auto">
          <div className="text-center border-b border-slate-800 pb-3 not-italic font-sans">
            <p className="text-xs uppercase font-bold tracking-widest text-amber-400">
              REPÚBLICA DE COLOMBIA · RAMA JUDICIAL DEL PODER PÚBLICO
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{caseRecord.authority}</p>
            <p className="text-[11px] font-mono text-slate-400 mt-1">
              Radicación: {caseRecord.filed_date}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <p className="font-semibold text-amber-200">
              PROCESO: {caseRecord.title} ({caseRecord.process_type})
            </p>
            <p>
              <strong>DEMANDANTE:</strong> Roberto Mendoza Vargas y/o J&A Legal
            </p>
            <p>
              <strong>DEMANDADO:</strong> {caseRecord.counterparty || "Parte contraparte procesal"}
            </p>
            <p className="italic text-slate-400 border-l-2 border-amber-500/40 pl-3 my-2">
              &quot;En mérito de lo expuesto y de conformidad con lo previsto en el Código General del
              Proceso y las normas concordantes vigentes, se procede a incorporar al expediente la
              presente pieza procesal con plenos efectos jurídicos...&quot;
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 pt-2 font-sans font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Documento cotejado y verificado con firma electrónica certificada</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <div className="flex items-center gap-4">
            <span>Tamaño: {document.file_size}</span>
            <span>Fecha de subida: {document.uploaded_at}</span>
            <span className="text-amber-400 font-semibold">{document.status}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              alert(`Descargando copia autorizada de: ${document.name}`);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Archivo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
