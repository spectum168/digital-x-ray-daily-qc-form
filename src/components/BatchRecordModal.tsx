import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCheck, 
  Calendar, 
  User, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2, 
  Info,
  CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DailyQCResult, GENERAL_QC_ITEMS, PORTABLE_QC_ITEMS } from '../types';

interface BatchRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDates: string[];
  onRemoveDate: (date: string) => void;
  defaultMachine: 'general' | 'portable';
  existingRecords: DailyQCResult[];
  onConfirmBatch: (data: {
    dates: string[];
    machine: 'general' | 'portable';
    inspector: string;
    role: string;
    time: string;
    statusPreset: 'all_pass' | 'await_repair';
    notes: string;
  }) => void;
}

export const BatchRecordModal: React.FC<BatchRecordModalProps> = ({
  isOpen,
  onClose,
  selectedDates,
  onRemoveDate,
  defaultMachine,
  existingRecords,
  onConfirmBatch,
}) => {
  const [machine, setMachine] = useState<'general' | 'portable'>(defaultMachine);
  const [inspector, setInspector] = useState('จิราภรณ์ วงค์แก้ว');
  const [role, setRole] = useState('จพง');
  const [time, setTime] = useState('08:00');
  const [statusPreset, setStatusPreset] = useState<'all_pass' | 'await_repair'>('all_pass');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setMachine(defaultMachine);
  }, [defaultMachine, isOpen]);

  if (!isOpen) return null;

  // Thai Date Formatter
  const formatThaiDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-');
      const thMonthNames = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
      ];
      const mIdx = parseInt(m) - 1;
      const yearBE = parseInt(y) + 543;
      return `${parseInt(d)} ${thMonthNames[mIdx]} ${yearBE}`;
    } catch {
      return dateStr;
    }
  };

  // Check which of the selected dates already have records for this machine
  const existingDatesSet = new Set(
    existingRecords
      .filter((r) => (r.machine || 'general') === machine)
      .map((r) => r.date)
  );

  const datesWithExisting = selectedDates.filter((d) => existingDatesSet.has(d));

  const sortedDates = [...selectedDates].sort();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDates.length === 0) return;
    if (!inspector.trim()) {
      return;
    }

    onConfirmBatch({
      dates: sortedDates,
      machine,
      inspector: inspector.trim(),
      role,
      time,
      statusPreset,
      notes: notes.trim(),
    });
  };

  const qcCount = machine === 'portable' ? PORTABLE_QC_ITEMS.length : GENERAL_QC_ITEMS.length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-8"
        >
          {/* Header */}
          <div className="bg-linear-to-r from-blue-700 to-indigo-800 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-white/10 text-white">
                <CheckCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold">
                  บันทึกผลตรวจสอบย้อนหลังพร้อมกัน ({selectedDates.length} วัน)
                </h3>
                <p className="text-xs text-blue-100">
                  สำหรับกรณีลงข้อมูลย้อนหลังหลายวันที่เครื่องทำงานปกติหรือรอซ่อม
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
            {/* Selected Dates Badges */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-bold flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-blue-600" />
                  วันที่เลือก ({selectedDates.length} วัน):
                </span>
                <span className="text-[11px] text-slate-400">คลิกที่ ✕ เพื่อนำวันที่ไม่ต้องการออก</span>
              </div>
              <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-32 overflow-y-auto">
                {sortedDates.map((dateStr) => {
                  const hasExisting = existingDatesSet.has(dateStr);
                  return (
                    <span
                      key={dateStr}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-medium text-[11px] transition-all ${
                        hasExisting
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}
                    >
                      <span>{formatThaiDate(dateStr)}</span>
                      {hasExisting && <span className="text-[10px] text-amber-700">(มีเดิม)</span>}
                      <button
                        type="button"
                        onClick={() => onRemoveDate(dateStr)}
                        className="hover:text-red-600 p-0.5 rounded cursor-pointer"
                        title="นำวันนี้ออก"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
              {datesWithExisting.length > 0 && (
                <div className="flex items-start space-x-2 text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-[11px]">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    พบ <b>{datesWithExisting.length} วัน</b> ที่มีข้อมูลบันทึกอยู่แล้ว การบันทึกครั้งนี้จะปรับปรุง (เขียนทับ) ข้อมูลเดิมของวันดังกล่าว
                  </span>
                </div>
              )}
            </div>

            {/* Target Machine Selector */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">
                เลือกเครื่องเอกซเรย์ที่ต้องการบันทึก:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMachine('general')}
                  className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                    machine === 'general'
                      ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs ring-1 ring-blue-500'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  General DR (6 จุดสำคัญ)
                </button>
                <button
                  type="button"
                  onClick={() => setMachine('portable')}
                  className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                    machine === 'portable'
                      ? 'bg-purple-50 border-purple-600 text-purple-700 shadow-xs ring-1 ring-purple-500'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Portable DR (13 จุดสำคัญ)
                </button>
              </div>
            </div>

            {/* Inspector Name & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>ชื่อผู้ตรวจ:</span>
                </label>
                <input
                  type="text"
                  required
                  value={inspector}
                  onChange={(e) => setInspector(e.target.value)}
                  placeholder="เช่น จิราภรณ์ วงค์แก้ว"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ตำแหน่ง/กลุ่มบุคลากร:</span>
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(['จพง', 'พนง', 'คนงาน'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-2 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                        role === r
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Time */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>เวลาที่บันทึกการตรวจ:</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs font-mono"
              />
            </div>

            {/* Status Preset */}
            <div className="space-y-2">
              <label className="font-bold text-slate-700 block">
                รูปแบบผลการตรวจทั้ง {qcCount} จุดของวันที่เลือก:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  onClick={() => setStatusPreset('all_pass')}
                  className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                    statusPreset === 'all_pass'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="statusPreset"
                    checked={statusPreset === 'all_pass'}
                    onChange={() => setStatusPreset('all_pass')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="font-bold text-xs flex items-center space-x-1 text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>ผ่านเกณฑ์ความปลอดภัยครบ 100%</span>
                    </p>
                    <p className="text-[11px] text-emerald-600">พร้อมใช้งานปกติทุกจุด</p>
                  </div>
                </label>

                <label
                  onClick={() => setStatusPreset('await_repair')}
                  className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                    statusPreset === 'await_repair'
                      ? 'bg-rose-50 border-rose-500 text-rose-950 ring-1 ring-rose-500'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="statusPreset"
                    checked={statusPreset === 'await_repair'}
                    onChange={() => setStatusPreset('await_repair')}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <p className="font-bold text-xs flex items-center space-x-1 text-rose-800">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>บันทึกสถานะ รอซ่อมแซม</span>
                    </p>
                    <p className="text-[11px] text-rose-600">เครื่องไม่พร้อมใช้งานหรือตรวจพบปัญหา</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">
                หมายเหตุเพิ่มเติม / ข้อสังเกต (จะบันทึกเหมือนกันทุกวันที่เลือก):
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="เช่น บันทึกย้อนหลังเนื่องจากระบบเครือข่ายขัดข้อง, เครื่องทำงานได้ตามปกติ"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={selectedDates.length === 0}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-97 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-blue-200 transition-all cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span>ยืนยันบันทึกข้อมูล {selectedDates.length} วัน</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BatchRecordModal;
