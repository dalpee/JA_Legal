export type Profile = {
  id: string;
  full_name: string;
  initials: string;
  role: "client" | "firm";
  email?: string;
  phone?: string;
  id_number?: string;
};

export type CasePhase = {
  id: string;
  name: string;
  description: string;
  status: "completed" | "in_progress" | "pending";
};

export type DocumentItem = {
  id: string;
  case_id: string;
  name: string;
  category: "Demanda" | "Memorial" | "Auto / Providencia" | "Poder" | "Pruebas" | "Facturación";
  file_size: string;
  uploaded_at: string;
  download_url?: string;
  status: "Oficial" | "Borrador" | "Firmado";
};

export type CaseRecord = {
  id: string;
  client_id: string;
  title: string;
  process_type: string;
  status: string;
  status_type?: "info" | "warning" | "success" | "neutral";
  filed_date: string | null;
  authority: string | null;
  city: string;
  lawyer: string | null;
  lawyer_role?: string;
  last_update: string;
  progress: number;
  balance: number;
  total_fees: number;
  documents_count: number;
  current_phase?: string;
  phases?: CasePhase[];
  counterparty?: string;
  observations?: string;
};

export type AgendaItem = {
  id: string;
  case_id: string;
  event_date: string;
  event_time?: string;
  title: string;
  detail: string | null;
  type?: "Audiencia Judicial" | "Vencimiento de Términos" | "Reunión con Cliente" | "Peritaje / Inspección";
  location?: string;
  virtual_link?: string;
};

export type HistoryItem = {
  id: string;
  case_id: string;
  event_date: string;
  title: string;
  detail: string | null;
  note: string | null;
  stage?: string;
  is_milestone?: boolean;
};

export type FinancialRecord = {
  id: string;
  case_id?: string;
  client_id?: string;
  client_name?: string;
  type: "ingreso" | "egreso";
  category: "Honorarios" | "Anticipo" | "Cuota de Honorarios" | "Costas Procesales" | "Gastos Notaría / Registro" | "Peritaje Judicial" | "Viáticos y Transporte" | "Operativo Despacho";
  concept: string;
  amount: number;
  date: string;
  status: "completado" | "pendiente";
  payment_method: "Transferencia Bancaria" | "PSE" | "Efectivo" | "Cheque";
  receipt_number: string;
  notes?: string;
};

export type CaseTemplate = {
  id: string;
  name: string;
  area: "Civil" | "Laboral" | "Comercial" | "Familia" | "Inmobiliario";
  description: string;
  caseData: Omit<CaseRecord, "id" | "client_id">;
  agenda: Omit<AgendaItem, "id" | "case_id">[];
  history: Omit<HistoryItem, "id" | "case_id">[];
  documents: Omit<DocumentItem, "id" | "case_id">[];
};
