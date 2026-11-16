import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { storage } from '../../services/storage';
import { ResaleLead, ResaleProperty } from '../../types/crm';

interface DataToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
  leads: ResaleLead[];
  properties: ResaleProperty[];
}

export const DataToolsModal: React.FC<DataToolsModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
  leads,
  properties
}) => {
  if (!isOpen) return null;

  const [importStatus, setImportStatus] = useState<string>('');

  const handleExportJson = () => {
    const jsonStr = storage.exportBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nagpur-resale-desk-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportLeadsCsv = () => {
    let csv = 'Lead Code,Name,Phone,WhatsApp,Intent,Category,Budget,Localities,Stage,Priority,Source,Assigned To,Created At\n';
    leads.forEach(l => {
      csv += `"${l.leadCode}","${l.name}","${l.phone}","${l.whatsapp || ''}","${l.intent}","${l.propertyCategory}","${l.budgetDisplay}","${l.preferredLocalities.join('; ')}","${l.stage}","${l.priority}","${l.source}","${l.assignedTo}","${l.createdAt}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPropertiesCsv = () => {
    let csv = 'ID,Title,Deal Type,Category,Locality,Price,Area SqFt,BHK,NMRDA Approved,RL Available,Status,Owner Name,Owner Phone\n';
    properties.forEach(p => {
      csv += `"${p.id}","${p.title}","${p.transactionType}","${p.category}","${p.locality}","${p.price}","${p.areaSqFt}","${p.bhk || ''}","${p.legalStatus.nmrdaApproved ? 'Yes' : 'No'}","${p.legalStatus.rlAvailable ? 'Yes' : 'No'}","${p.status}","${p.owner.name}","${p.owner.phone}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `properties-inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetData = () => {
    if (confirm('Reset CRM database to original demo listings and leads? Custom changes will be replaced.')) {
      storage.resetToDemoData();
      onDataChanged();
      setImportStatus('Reset successfully to authentic Saraswati Nagri & Nagpur Properties dataset!');
      setTimeout(() => onClose(), 1500);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = storage.importBackupJson(content);
      if (success) {
        onDataChanged();
        setImportStatus('Backup restored successfully!');
        setTimeout(() => onClose(), 1500);
      } else {
        setImportStatus('Failed to parse JSON backup. Please check file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl glass-panel bg-slate-900 border border-slate-700 shadow-2xl p-6">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Data Management & Backup</h2>
              <p className="text-xs text-slate-400">Offline-first local persistence & export tools</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {importStatus && (
          <div className="my-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}

        <div className="py-4 space-y-4 text-xs">
          
          {/* CSV Exports */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <span className="font-bold text-slate-300 uppercase tracking-wider block">Spreadsheet (CSV) Exports</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportLeadsCsv}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold border border-slate-700 transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4 text-blue-400" />
                <span>Export Leads</span>
              </button>

              <button
                onClick={handleExportPropertiesCsv}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold border border-slate-700 transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                <span>Export Inventory</span>
              </button>
            </div>
          </div>

          {/* Full JSON Backup */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <span className="font-bold text-slate-300 uppercase tracking-wider block">Full Database Backup (JSON)</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportJson}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold border border-slate-700 transition-colors"
              >
                <Download className="h-4 w-4 text-emerald-400" />
                <span>Download Backup</span>
              </button>

              <label className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold border border-slate-700 transition-colors cursor-pointer">
                <Upload className="h-4 w-4 text-indigo-400" />
                <span>Restore JSON</span>
                <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
              </label>
            </div>
          </div>

          {/* Reset Demo Data */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-200 block">Reset to Demo Dataset</span>
              <span className="text-[11px] text-slate-400">Restore Saraswati Nagri & Nagpur Properties records</span>
            </div>
            <button
              onClick={handleResetData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>

        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

