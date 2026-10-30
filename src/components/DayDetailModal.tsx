import React from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  User, 
  Edit3, 
  Trash2, 
  Calendar as CalendarIcon,
  Check,
  ShieldCheck,
  Wrench
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DailyQCResult, GENERAL_QC_ITEMS, PORTABLE_QC_ITEMS } from '../types';

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DailyQCResult | null;
  onEdit: (record: DailyQCResult) => void;
  onDelete: (date: string, machine: 'general' | 'portable') => void;
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({
  isOpen,
  onClose,
  record,
  onEdit,
  onDelete,
}) => {
  if (!isOpen || !record) return null;

  const machineType = record.machine || 'general';
  const qcItems = machineType === 'portable' ? PORTABLE_QC_ITEMS : GENERAL_QC_ITEMS;
  const isPortable = machineType === 'portable';

  // Format date to Thai format
  const formatDateThai = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-');
      const thMonthNames = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      const monthIndex = parseInt(m) - 1;
      const yearBE = parseInt(y) + 543;
      return `${parseInt(d)} ${thMonthNames[monthIndex]} พ.ศ. ${yearBE}`;
    } catch {
      return dateStr;
    }
  };

  const failedItems = qcItems.filter(item => record.results[item.id] === 'ไม่ผ่าน');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    {isPortable ? 'PORTABLE X-RAY' : 'GENERAL X-RAY'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {record.date}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-100 mt-0.5">
                  ผลการตรวจสอบประจำวันที่ {formatDateThai(record.date)}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="ปิด"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Status Summary Banner */}
            <div className={`p-4 rounded-xl border flex items-start space-x-3.5 ${
              record.hasFailures
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              {record.hasFailures ? (
                <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-sm sm:text-base">
                    {record.hasFailures 
                      ? '❌ ไม่ผ่านเกณฑ์ความปลอดภัย / พบจุดขัดข้อง' 
                      : '✅ ผ่านเกณฑ์ความปลอดภัยครบถ้วน'}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    record.readinessStatus === 'รอซ่อมแซม'
                      ? 'bg-rose-200/80 text-rose-800'
                      : 'bg-emerald-200/80 text-emerald-800'
                  }`}>
                    {record.readinessStatus || (record.hasFailures ? 'รอซ่อมแซม' : 'ใช้งานได้ปกติ')}
                  </span>
                </div>
                <p className="text-xs leading-relaxed opacity-90">
                  {record.hasFailures
                    ? `พบจุดที่ไม่ผ่านขั้นตอนตรวจสอบความปลอดภัยจำนวน ${failedItems.length} จุด กรุณาตรวจสอบและดำเนินการแก้ไขก่อนนำไปฉายรังสีผู้ป่วย`
                    : 'ระบบและกลไกความปลอดภัยของเครื่องผ่านการประเมิน 100% พร้อมให้บริการวินิจฉัย'}
                </p>
              </div>
            </div>

            {/* Inspector and Time Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">ผู้ตรวจสอบ:</span>
                  <span className="font-bold text-slate-800">{record.inspector}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">ตำแหน่ง/กลุ่ม:</span>
                  <span className="font-bold text-slate-800 font-mono">{record.role}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">เวลาตรวจสอบ:</span>
                  <span className="font-bold text-slate-800 font-mono">{record.time} น.</span>
                </div>
              </div>
            </div>

            {/* Checklist Results Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  ผลการตรวจสอบตามเกณฑ์ {qcItems.length} จุดสำคัญ
                </h4>
                <span className="text-xs text-slate-500 font-mono">
                  ผ่าน {qcItems.length - failedItems.length} / {qcItems.length}
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 shadow-2xs">
                {qcItems.map((item) => {
                  const status = record.results[item.id] || 'ผ่าน';
                  const isFail = status === 'ไม่ผ่าน';

                  return (
                    <div 
                      key={item.id}
                      className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                        isFail ? 'bg-rose-50/80 text-rose-950 font-medium' : 'bg-white hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5 ${
                          isFail ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.id}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 truncate">{item.title}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{item.description}</p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isFail ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-black bg-rose-600 text-white shadow-xs">
                            <AlertTriangle className="w-3 h-3" />
                            <span>ไม่ผ่าน</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3" />
                            <span>ผ่าน</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes / Remarks */}
            {record.notes && (
              <div className={`p-4 rounded-xl border text-xs space-y-1 ${
                record.hasFailures 
                  ? 'bg-amber-50 border-amber-200 text-amber-900' 
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <div className="flex items-center space-x-1.5 font-bold">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>หมายเหตุบันทึก / อาการขัดข้อง:</span>
                </div>
                <p className="text-xs leading-relaxed whitespace-pre-wrap pl-5">
                  {record.notes}
                </p>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={() => {
                onDelete(record.date, machineType);
                onClose();
              }}
              className="w-full sm:w-auto px-3.5 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>ลบประวัติวันนี้</span>
            </button>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>

              <button
                onClick={() => {
                  onEdit(record);
                  onClose();
                }}
                className="flex-1 sm:flex-none px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-97 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-blue-200 transition-all cursor-pointer"
                id="modal-btn-edit-day"
              >
                <Edit3 className="w-4 h-4" />
                <span>แก้ไขข้อมูลเฉพาะวันนี้</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DayDetailModal;
