import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Calendar as CalendarIcon, 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  PlusCircle, 
  User, 
  Clock, 
  ClipboardCheck, 
  Trash2, 
  Printer, 
  Download, 
  RefreshCw, 
  BookOpen, 
  ArrowRight,
  Sparkles,
  Info,
  Database,
  Cloud,
  LogOut,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MANDATORY_QC_ITEMS, GENERAL_QC_ITEMS, PORTABLE_QC_ITEMS, DailyQCResult, InspectorRole } from './types';
import { generateMockRecords } from './mockData';
import {
  initAuth,
  googleSignIn,
  googleSignOut,
  createAndPopulateSheet,
  writeRecordsToSheet
} from './googleSheets';
import SignatureModal from './components/SignatureModal';

const getTodayDateString = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function App() {
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Local states for keeping track of logs
  const [records, setRecords] = useState<DailyQCResult[]>([]);
  const [activeTab, setActiveTab] = useState<'form' | 'dashboard' | 'report'>('form');
  
  // Google Sheets & Firebase Auth states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isSyncingSheet, setIsSyncingSheet] = useState<boolean>(false);
  const [syncedSpreadsheetId, setSyncedSpreadsheetId] = useState<string | null>(() => {
    return localStorage.getItem('xray_f1_spreadsheet_id');
  });
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('xray_f1_last_sync_time');
  });

  // Selected machine for viewing in Dashboard and Report tabs
  const [selectedMachine, setSelectedMachine] = useState<'general' | 'portable'>('general');

  // States for the active Form F1 input
  const [formDate, setFormDate] = useState<string>(getTodayDateString());
  const [formTime, setFormTime] = useState<string>('08:30');
  const [formInspector, setFormInspector] = useState<string>('สิทธิศักดิ์ เลาหกุล');
  const [formRole, setFormRole] = useState<InspectorRole>('จพง');
  const [formMachine, setFormMachine] = useState<'general' | 'portable'>('general');
  const [formReadinessStatus, setFormReadinessStatus] = useState<'ใช้งานได้ปกติ' | 'รอซ่อมแซม'>('ใช้งานได้ปกติ');

  const getDefaultStatuses = (machine: 'general' | 'portable') => {
    const items = machine === 'portable' ? PORTABLE_QC_ITEMS : GENERAL_QC_ITEMS;
    const statuses: { [itemId: number]: 'ผ่าน' | 'ไม่ผ่าน' } = {};
    items.forEach(item => {
      statuses[item.id] = 'ผ่าน';
    });
    return statuses;
  };

  const [itemStatuses, setItemStatuses] = useState<{ [itemId: number]: 'ผ่าน' | 'ไม่ผ่าน' }>(() => getDefaultStatuses('general'));
  const [formNotes, setFormNotes] = useState<string>('');
  
  // UI helper states
  const [selectedCalendarRecord, setSelectedCalendarRecord] = useState<DailyQCResult | null>(null);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<number>(() => new Date().getMonth()); // Fully dynamic init
  const [currentCalendarYear, setCurrentCalendarYear] = useState<number>(() => new Date().getFullYear()); // Fully dynamic init
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Digital Signature & Dynamic PDF Export States
  const [operatorSig, setOperatorSig] = useState<string | null>(() => localStorage.getItem('xray_qc_operator_sig') || null);
  const [operatorName, setOperatorName] = useState<string>(() => localStorage.getItem('xray_qc_operator_name') || 'สิทธิศักดิ์ เลาหกุล');
  const [operatorDate, setOperatorDate] = useState<string>(() => {
    return localStorage.getItem('xray_qc_operator_date') || new Date().toLocaleDateString('th-TH', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  });

  const [physicistSig, setPhysicistSig] = useState<string | null>(() => localStorage.getItem('xray_qc_physicist_sig') || null);
  const [physicistName, setPhysicistName] = useState<string>(() => localStorage.getItem('xray_qc_physicist_name') || 'ธีรพล เตจ๊ะเสาร์');
  const [physicistDate, setPhysicistDate] = useState<string>(() => {
    return localStorage.getItem('xray_qc_physicist_date') || new Date().toLocaleDateString('th-TH', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  });

  const [isSigModalOpen, setIsSigModalOpen] = useState<boolean>(false);
  const [sigModalType, setSigModalType] = useState<'operator' | 'physicist' | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);

  // Initialize data (try to load from local storage or bootstrap with mock data)
  useEffect(() => {
    const saved = localStorage.getItem('xray_qc_f1_records');
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading saved records, using mock data", e);
        const mocks = generateMockRecords();
        setRecords(mocks);
        localStorage.setItem('xray_qc_f1_records', JSON.stringify(mocks));
      }
    } else {
      const mocks = generateMockRecords();
      setRecords(mocks);
      localStorage.setItem('xray_qc_f1_records', JSON.stringify(mocks));
    }
  }, []);

  // Update current time on load
  useEffect(() => {
    const now = new Date();
    // Default form time to now but allow customization
    const hrs = now.getHours().toString().padStart(2, '0');
    const mins = now.getMinutes().toString().padStart(2, '0');
    setFormTime(`${hrs}:${mins}`);
  }, []);

  // Google Authentication Observer
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setGoogleToken(token);
      },
      () => {
        setCurrentUser(null);
        setGoogleToken(null);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setGoogleToken(result.accessToken);
        triggerToast(`เชื่อมต่อบัญชี Google สำเร็จ: คุณ ${result.user.displayName || 'ผู้ใช้'}`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      triggerToast('ไม่สามารถเชื่อมต่อบัญชี Google ได้ กรุณาลองใหม่อีกครั้ง', 'error');
    }
  };

  const handleGoogleSignOut = async () => {
    if (window.confirm('คุณต้องการยกเลิกการล็อกอินบัญชี Google หรือไม่?')) {
      await googleSignOut();
      setCurrentUser(null);
      setGoogleToken(null);
      triggerToast('ยกเลิกการเชื่อมต่อบัญชี Google สำเร็จ', 'info');
    }
  };

  const handleSyncToSheets = async (forceNewSheet: boolean = false) => {
    if (!googleToken) {
      triggerToast('กรุณาเชื่อมบัญชี Google ของท่านก่อน', 'error');
      return;
    }

    setIsSyncingSheet(true);
    try {
      let sheetId = forceNewSheet ? null : syncedSpreadsheetId;
      const thMonth = thMonthNames[currentCalendarMonth];
      const yearBE = currentCalendarYear + 543;

      if (!sheetId) {
        // Create new Sheet
        sheetId = await createAndPopulateSheet(googleToken, records, thMonth, yearBE, selectedMachine);
        setSyncedSpreadsheetId(sheetId);
        localStorage.setItem('xray_f1_spreadsheet_id', sheetId);
        triggerToast('สร้างแผ่นงาน Google Sheets ใหม่และนำเข้าข้อมูลเสร็จสิ้น!', 'success');
      } else {
        // Overwrite and update existing spreadsheet ID
        await writeRecordsToSheet(googleToken, sheetId, records, thMonth, yearBE, selectedMachine);
        triggerToast('ปรับปรุงข้อมูลลงในแผ่นงาน Google Sheets ตัวเดิมเสร็จสิ้น!', 'success');
      }

      const syncTimeStr = new Date().toLocaleTimeString('th-TH');
      setLastSyncTime(syncTimeStr);
      localStorage.setItem('xray_f1_last_sync_time', syncTimeStr);
    } catch (err: any) {
      console.error(err);
      if (err.message && (err.message.includes('401') || err.message.includes('unauthorized') || err.message.includes('Token'))) {
        triggerToast('ตรวจพบเซสชันความปลอดภัยหมดอายุ กรุณาเข้าสู่ระบบ Google ใหม่อีกครั้ง', 'error');
        setCurrentUser(null);
        setGoogleToken(null);
      } else {
        triggerToast('การซิงก์ข้อมูลล้มเหลว กรุณาตรวจสอบสถานะอินเทอร์เน็ต', 'error');
      }
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const handlePrevMonth = () => {
    if (currentCalendarMonth === 0) {
      setCurrentCalendarMonth(11);
      setCurrentCalendarYear(prev => prev - 1);
    } else {
      setCurrentCalendarMonth(prev => prev - 1);
    }
    setSelectedCalendarRecord(null);
  };

  const handleNextMonth = () => {
    if (currentCalendarMonth === 11) {
      setCurrentCalendarMonth(0);
      setCurrentCalendarYear(prev => prev + 1);
    } else {
      setCurrentCalendarMonth(prev => prev + 1);
    }
    setSelectedCalendarRecord(null);
  };

  const saveToLocalStorage = (updatedRecords: DailyQCResult[]) => {
    setRecords(updatedRecords);
    localStorage.setItem('xray_qc_f1_records', JSON.stringify(updatedRecords));
  };

  // Helper trigger for toast notification
  const triggerToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Determine if any check item is "ไม่ผ่าน"
  const hasAnyFailure = Object.values(itemStatuses).some(status => status === 'ไม่ผ่าน');

  // Submit form handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formInspector.trim()) {
      triggerToast('กรุณากรอกชื่อผู้ตรวจสอบหลักก่อนบันทึก', 'error');
      return;
    }

    // Prepare QC payload
    const newRecord: DailyQCResult = {
      date: formDate,
      time: formTime,
      inspector: formInspector.trim(),
      role: formRole,
      results: { ...itemStatuses },
      notes: formNotes.trim(),
      hasFailures: hasAnyFailure,
      timestamp: new Date(`${formDate}T${formTime}:00`).getTime(),
      machine: formMachine,
      readinessStatus: formReadinessStatus
    };

    // Check if a record already exists for this date and machine. If so, replace it or update
    const existingIndex = records.findIndex(r => r.date === formDate && (r.machine || 'general') === formMachine);
    let updated: DailyQCResult[];
    
    if (existingIndex >= 0) {
      updated = [...records];
      updated[existingIndex] = newRecord;
      triggerToast(`อัปเดตบันทึกการตรวจสอบของวันที่ ${formDate} สำหรับเครื่อง ${formMachine === 'portable' ? 'Portable' : 'General'} เรียบร้อยแล้ว`, 'success');
    } else {
      updated = [newRecord, ...records];
      triggerToast(`บันทึกการตรวจสอบประจำวันที่ ${formDate} สำหรับเครื่อง ${formMachine === 'portable' ? 'Portable' : 'General'} สำเร็จ`, 'success');
    }

    // Sort records descending by date
    updated.sort((a, b) => b.date.localeCompare(a.date));
    saveToLocalStorage(updated);

    // If connected to Google Sheets, auto-sync in the background!
    if (googleToken && syncedSpreadsheetId) {
      const thMonth = thMonthNames[currentCalendarMonth];
      const yearBE = currentCalendarYear + 543;
      
      writeRecordsToSheet(googleToken, syncedSpreadsheetId, updated, thMonth, yearBE, formMachine)
        .then(() => {
          triggerToast('ออโต้ซิงก์ข้อมูลไปที่แผ่นงาน Google Sheets สำเร็จ', 'success');
          const syncTimeStr = new Date().toLocaleTimeString('th-TH');
          setLastSyncTime(syncTimeStr);
          localStorage.setItem('xray_f1_last_sync_time', syncTimeStr);
        })
        .catch((err) => {
          console.error('Auto-sync failed:', err);
          triggerToast('ตรวจซิงก์ข้อมูลอัตโนมัติไม่สำเร็จชั่วคราว', 'info');
        });
    }

    // Set selectedMachine to view the machine we just logged
    setSelectedMachine(formMachine);

    // Reset some of form input or status
    setFormNotes('');
    
    // Smooth transition to dashboard to show results
    setTimeout(() => {
      setActiveTab('dashboard');
    }, 850);
  };

  // Populate form with existing record details to edit
  const handleEditRecord = (record: DailyQCResult) => {
    setFormDate(record.date);
    setFormTime(record.time);
    setFormInspector(record.inspector);
    setFormRole(record.role);
    setItemStatuses({ ...record.results });
    setFormNotes(record.notes);
    setFormMachine(record.machine || 'general');
    setFormReadinessStatus(record.readinessStatus || (record.hasFailures ? 'รอซ่อมแซม' : 'ใช้งานได้ปกติ'));
    setActiveTab('form');
    setSelectedCalendarRecord(null);
    triggerToast(`โหลดข้อมูลเครื่อง ${record.machine === 'portable' ? 'Portable' : 'General'} วันที่ ${record.date} พร้อมแก้ไข`, 'info');
  };

  // Delete handler
  const handleDeleteRecord = (date: string, machine: 'general' | 'portable') => {
    if (window.confirm(`คุณต้องการลบข้อมูล QC เครื่อง ${machine === 'portable' ? 'Portable' : 'General'} วันที่ ${date} ใช่หรือไม่?`)) {
      const updated = records.filter(r => !(r.date === date && (r.machine || 'general') === machine));
      saveToLocalStorage(updated);
      setSelectedCalendarRecord(null);
      triggerToast(`ลบข้อมูล QC วันที่ ${date} เรียบร้อยแล้ว`, 'info');
    }
  };

  // Clear all and restore mock data for testing
  const handleRestoreMocks = () => {
    if (window.confirm('คุณต้องการรีเซ็ตข้อมูลตัวอย่างกลับเป็นค่าเริ่มต้น (มีนาคม/พฤษภาคม 2026) ใช่หรือไม่?')) {
      const mocks = generateMockRecords();
      saveToLocalStorage(mocks);
      triggerToast('รีเซ็ตข้อมูลและคืนค่าตัวบันทึก QC สำเร็จ (19 วันแรกของเดือนพฤษภาคม)', 'success');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    try {
      // Create headers
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Prepend BOM for Excel Thai characters support
      csvContent += "วันที่,เวลา,ผู้ตรวจสอบ,บทบาท/ตำแหน่ง,1.สายไฟ,2.ระบบล็อค,3.เตียงเอกซเรย์,4.หลอดเอกซเรย์,5.บัคกี้,6.Warm-up,สรุปผลการตรวจ,หมายเหตุ\n";
      
      const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
      sorted.forEach(r => {
        const item1 = r.results[1] || 'ไม่ได้ตรวจ';
        const item2 = r.results[2] || 'ไม่ได้ตรวจ';
        const item3 = r.results[3] || 'ไม่ได้ตรวจ';
        const item4 = r.results[4] || 'ไม่ได้ตรวจ';
        const item5 = r.results[5] || 'ไม่ได้ตรวจ';
        const item6 = r.results[6] || 'ไม่ได้ตรวจ';
        const status = r.hasFailures ? "ไม่ผ่านเกณฑ์" : "ผ่านเกณฑ์";
        const cleanNotes = r.notes ? r.notes.replace(/,/g, ' ') : '';
        csvContent += `${r.date},${r.time},${r.inspector},${r.role},${item1},${item2},${item3},${item4},${item5},${item6},${status},${cleanNotes}\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `X-Ray_QC_Form_F1_May_2026_Report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerToast('ส่งออกไฟล์รายงาน CSV สำเร็จ', 'success');
    } catch (e) {
      triggerToast('พบข้อผิดพลาดในการส่งออกไฟล์', 'error');
    }
  };

  // Export to Print (Print system triggers the built-in system)
  const handlePrint = () => {
    window.focus();
    window.print();
  };

  const handleSaveSignature = (sigUrl: string, name: string, date: string) => {
    if (sigModalType === 'operator') {
      if (sigUrl) {
        setOperatorSig(sigUrl);
        localStorage.setItem('xray_qc_operator_sig', sigUrl);
      }
      setOperatorName(name);
      setOperatorDate(date);
      localStorage.setItem('xray_qc_operator_name', name);
      localStorage.setItem('xray_qc_operator_date', date);
      triggerToast('บันทึกลายเซ็นผู้ตรวจสอบประจำวันสำเร็จ', 'success');
    } else if (sigModalType === 'physicist') {
      if (sigUrl) {
        setPhysicistSig(sigUrl);
        localStorage.setItem('xray_qc_physicist_sig', sigUrl);
      }
      setPhysicistName(name);
      setPhysicistDate(date);
      localStorage.setItem('xray_qc_physicist_name', name);
      localStorage.setItem('xray_qc_physicist_date', date);
      triggerToast('บันทึกลายเซ็นผู้รับรอง Physicist สำเร็จ', 'success');
    }
  };

  const handleClearSignature = (role: 'operator' | 'physicist') => {
    if (role === 'operator') {
      setOperatorSig(null);
      localStorage.removeItem('xray_qc_operator_sig');
      triggerToast('ลบลายเซ็นผู้ตรวจสอบเรียบร้อย', 'info');
    } else {
      setPhysicistSig(null);
      localStorage.removeItem('xray_qc_physicist_sig');
      triggerToast('ลบลายเซ็นผู้รับรองเรียบร้อย', 'info');
    }
  };

  const handleExportPDF = async () => {
    const printArea = document.getElementById('print-area');
    if (!printArea) {
      triggerToast('ไม่พบบริเวณที่ต้องการพิมพ์รายงาน', 'error');
      return;
    }

    setIsExportingPDF(true);
    triggerToast('กำลังเตรียมข้อมูลจัดทำไฟล์ PDF สักครู่...', 'info');

    try {
      const html2canvasModule = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvasModule(printArea, {
        scale: 2, // 2x sharp
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / imgHeight;
      
      const renderWidth = pdfWidth;
      const renderHeight = pdfWidth / ratio;
      
      if (renderHeight > pdfHeight) {
        let heightLeft = renderHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'JPEG', 0, position, renderWidth, renderHeight);
        heightLeft -= pdfHeight;
        
        while (heightLeft >= 0) {
          position = heightLeft - renderHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, renderWidth, renderHeight);
          heightLeft -= pdfHeight;
        }
      } else {
        pdf.addImage(imgData, 'JPEG', 0, 0, renderWidth, renderHeight);
      }

      const thMonth = thMonthNames[currentCalendarMonth];
      const yearBE = currentCalendarYear + 543;
      pdf.save(`รายงาน_Form_F1_รพ_แม่ทา_${thMonth}_${yearBE}.pdf`);
      triggerToast('สร้างและดาวน์โหลดไฟล์ PDF เรียบร้อยแล้ว!', 'success');
    } catch (e) {
      console.error('PDF generation error:', e);
      triggerToast('การสร้าง PDF ล้มเหลว โปรดคลิกพิมพ์รายงานแล้วบันทึกเป็น PDF แทน', 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Calculations for dashboard
  const currentMonthRecords = records.filter(r => {
    const [yearStr, monthStr] = r.date.split('-');
    const rYear = parseInt(yearStr);
    const rMonth = parseInt(monthStr) - 1; // 0-based month
    return rMonth === currentCalendarMonth && rYear === currentCalendarYear;
  });

  const totalRegisteredDays = currentMonthRecords.length;
  const passedRecords = currentMonthRecords.filter(r => !r.hasFailures);
  const totalPassedDays = passedRecords.length;
  const passRatePercentage = totalRegisteredDays > 0 
    ? ((totalPassedDays / totalRegisteredDays) * 100).toFixed(1) 
    : '0.0';

  // Get list of days for calendar display (May has 31 days)
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInMonthCount = getDaysInMonth(currentCalendarMonth, currentCalendarYear);
  const firstDayOfMonth = new Date(currentCalendarYear, currentCalendarMonth, 1).getDay(); // Sunday=0, Monday=1 etc.

  const thMonthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  // Quick fill buttons helper to pass all checklist items with 1 click
  const quickFillAllPassed = () => {
    const items = formMachine === 'portable' ? PORTABLE_QC_ITEMS : GENERAL_QC_ITEMS;
    const statuses: { [itemId: number]: 'ผ่าน' | 'ไม่ผ่าน' } = {};
    items.forEach(item => {
      statuses[item.id] = 'ผ่าน';
    });
    setItemStatuses(statuses);
    triggerToast(`ทำเครื่องหมาย "ผ่าน" ในทั้ง ${items.length} รายการสำหรับ${formMachine === 'portable' ? 'เครื่องเคลื่อนที่' : 'เครื่องทั่วไป'}โดยอัตโนมัติ`, 'success');
  };

  const quickFillAllFailed = () => {
    const items = formMachine === 'portable' ? PORTABLE_QC_ITEMS : GENERAL_QC_ITEMS;
    const statuses: { [itemId: number]: 'ผ่าน' | 'ไม่ผ่าน' } = {};
    items.forEach(item => {
      statuses[item.id] = 'ผ่าน';
    });
    statuses[1] = 'ไม่ผ่าน';
    setItemStatuses(statuses);
    triggerToast('ตั้งรายการที่ 1 เป็น "ไม่ผ่าน" เพื่อทดสอบตรรกะระบบแจ้งเตือน', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      {/* Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 pointer-events-none max-w-md w-full px-4">
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className={`p-4 rounded-xl shadow-lg flex items-center justify-between pointer-events-auto border ${
                toastMessage.type === 'success' 
                  ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
                  : toastMessage.type === 'error'
                  ? 'border-rose-100 bg-rose-50 text-rose-800'
                  : 'border-blue-100 bg-blue-50 text-blue-800'
              }`}
              id="qc-toast"
            >
              <div className="flex items-center space-x-3">
                {toastMessage.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : toastMessage.type === 'error' ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                ) : (
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
                )}
                <span className="text-sm font-medium">{toastMessage.text}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Official Medical Header Banner (Thai Ministry of Health Style Format) */}
      <header className="bg-slate-900 text-white border-b-4 border-blue-600 shadow-md print:bg-white print:text-black print:border-slate-800 print:shadow-none">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-850 p-3 rounded-xl shadow-inner text-white flex-shrink-0 print:border print:border-slate-300 print:bg-none print:text-blue-900">
              <Activity className="w-8 h-8 motion-safe:animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="bg-blue-500/20 text-blue-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-400/30 font-mono print:border-slate-400 print:text-slate-700">
                  FORM F1 - DAILY QC
                </span>
                <span className="text-xs text-slate-400 font-mono print:text-slate-500">
                  QA-DR-SYS Version 3.2
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-1 text-slate-100 print:text-slate-900">
                ระบบบันทึกการตรวจสอบเครื่องเอกซเรย์ประจำวัน
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5 print:text-slate-700">
                ฝ่ายรังสีวิทยา (Quality Assurance & Medical Physics)
              </p>
            </div>
          </div>
          
          {/* Healthcare Facility Details badge */}
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700 max-w-sm flex items-center justify-between space-x-4 print:border-slate-300 print:bg-slate-50">
            <div className="text-right">
              <p className="text-xs text-slate-400 font-medium print:text-slate-600">อุปกรณ์ติดตั้ง</p>
              <p className="text-sm font-bold text-blue-400 print:text-slate-900">Digital X-Ray DR System 01</p>
              <p className="text-[10px] text-slate-500 font-mono print:text-slate-500">SN: DR-2026-XRG99</p>
            </div>
            <div className="h-8 w-px bg-slate-700 print:bg-slate-300"></div>
            <div className="text-right">
              <p className="text-xs text-slate-400">สถานะวันนี้</p>
              {records.some(r => r.date === getTodayDateString()) ? (
                <span className="inline-flex items-center text-xs font-semibold text-emerald-400 print:text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-ping"></span>
                  บันทึกแล้ว
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-semibold text-amber-400 print:text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-400 mr-1.5"></span>
                  รอตรวจสอบ
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Primary Global Navigation Control - Underlines */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-14">
            <div className="flex space-x-8 overflow-x-auto scrollbar-none py-1">
              <button
                onClick={() => { setActiveTab('form'); setSelectedCalendarRecord(null); }}
                className={`inline-flex items-center px-1 pt-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'form'
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
                id="tab-btn-form"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                กรอกบันทึกตรวจประจำวัน (Form F1)
              </button>
              <button
                onClick={() => { setActiveTab('dashboard'); setSelectedCalendarRecord(null); }}
                className={`inline-flex items-center px-1 pt-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'dashboard'
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
                id="tab-btn-dashboard"
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                แดชบอร์ดรายเดือน & ปฏิทิน
              </button>
              <button
                onClick={() => { setActiveTab('report'); setSelectedCalendarRecord(null); }}
                className={`inline-flex items-center px-1 pt-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'report'
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
                id="tab-btn-report"
              >
                <FileText className="w-4 h-4 mr-2" />
                พิมพ์เอกสารถอนรายงาน (F1 Sheets)
              </button>
            </div>

            {/* Quick Helper actions on the right */}
            <div className="flex items-center space-x-2">
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 sm:px-6 w-full print:py-0 print:px-0">
        
        {/* Machine Toggle Sub-header - Select General vs Portable */}
        {activeTab !== 'form' && (
          <div className="mb-6 bg-slate-100 p-1.5 rounded-2xl flex max-w-xl mx-auto border border-slate-200 print:hidden shadow-inner">
            <button
              onClick={() => { setSelectedMachine('general'); setSelectedCalendarRecord(null); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 ${
                selectedMachine === 'general'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
              }`}
            >
              <span className="text-sm">🖥️</span>
              <span>เครื่องทั่วไป (General DR-01)</span>
            </button>
            <button
              onClick={() => { setSelectedMachine('portable'); setSelectedCalendarRecord(null); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 ${
                selectedMachine === 'portable'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
              }`}
            >
              <span className="text-sm">🛞</span>
              <span>เครื่องเคลื่อนที่ (Portable DR-02)</span>
            </button>
          </div>
        )}
        
        {/* Dynamic Medical Physics Brief Alert Banner */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
          <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-850 shadow-sm flex items-center justify-between col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3.5">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/30 text-blue-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">คู่มือ QC มาตรฐาน (Form F1)</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  ต้องดำเนินการตรวจสอบก่อนใช้งานรอบแรกประจำวัน โดยมีผลบังคับใช้ตามเกณฑ์ควบคุมการจ่ายรังสี คณะกรรมการความปลอดภัยรังสีวิทยา
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-indigo-900 text-white rounded-xl p-4 shadow-md flex items-center justify-between border border-blue-700/50">
            <div>
              <p className="text-[10px] text-blue-100 uppercase tracking-widest font-bold">สถิติพฤษภาคม 2026</p>
              <h3 className="text-2xl font-black mt-1 font-mono tracking-tight">{totalPassedDays}/{totalRegisteredDays} วัน</h3>
              <p className="text-xs text-blue-100/80 mt-0.5">ผ่านเกณฑ์สะสมคิดเป็น {passRatePercentage}%</p>
            </div>
            <div className="h-12 w-12 rounded-full border border-white/20 bg-white/10 flex items-center justify-center font-mono font-bold text-sm">
              {passRatePercentage}%
            </div>
          </div>
        </div>

        {/* Tab 1: QC Input Form (Form F1) */}
        {activeTab === 'form' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              
              <form onSubmit={handleFormSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" id="qc-f1-input-form">
                
                {/* Form header */}
                <div className="bg-slate-50 px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center">
                      <ClipboardCheck className="w-5 h-5 mr-2 text-blue-600" />
                      กรอกใบบันทึกผลตรวจสอบประจำวัน (Form F1)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">กรุณากรอกข้อมูลและเลือกสถานะผลตรวจวิเคราะห์เครื่องเอกซเรย์ทั้ง 6 ด่าน</p>
                  </div>
                  
                  {/* Smart helper tool to speed up typing for busy radiology staff */}
                  <div className="flex space-x-1.5 self-start sm:self-center">
                    <button 
                      type="button"
                      onClick={quickFillAllPassed}
                      className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-all flex items-center"
                    >
                      <Check className="w-3 h-3 mr-1" /> Auto-Pass
                    </button>
                    <button 
                      type="button"
                      onClick={quickFillAllFailed}
                      className="px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs font-semibold hover:bg-red-100 transition-all flex items-center"
                      title="สลับสถานะเพื่อดูวิวัฒนาการแจ้งเตือนทันที"
                    >
                      <AlertTriangle className="w-3 h-3 mr-1" /> ทดสอบพัง
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Metadata and Inspector Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60">
                    
                    {/* Date select */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        วันที่ตรวจสอบ
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={formDate}
                          onChange={(e) => setFormDate(e.target.value)}
                          className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                          id="form-input-date"
                        />
                      </div>
                    </div>

                    {/* Time select */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        เวลาตรวจวิเคราะห์
                      </label>
                      <div className="relative">
                        <input
                          type="time"
                          value={formTime}
                          onChange={(e) => setFormTime(e.target.value)}
                          className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                          id="form-input-time"
                        />
                      </div>
                    </div>

                    {/* Inspector level / role select */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        กลุ่มผู้ตรวจสอบ
                      </label>
                      <div className="grid grid-cols-3 gap-1 bg-slate-200 p-0.5 rounded-lg">
                        {(['จพง', 'พนง', 'คนงาน'] as InspectorRole[]).map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setFormRole(role)}
                            className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                              formRole === role
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                            id={`role-select-${role}`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Inspector Name description */}
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        ชื่อผู้ตรวจสอบหลัก (Inspector Name)
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={formInspector}
                          onChange={(e) => setFormInspector(e.target.value)}
                          placeholder="ระบุชื่อ-นามสกุลจริงผู้ตรวจสอบ"
                          className="pl-10 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          required
                          id="form-input-inspector"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        * ปรับแต่งระดับความรับผิดชอบ: จพง. (เจ้าพนักงานรังสีฯ), พนง. (พนักงานพัฒนา/วิชาชีพกลุ่มรังสีฯ), คนงาน (ผู้จัดเตรียมและช่วยเหลือบริการห้องเอกซเรย์)
                      </p>
                    </div>

                    {/* Machine and Readiness Selection */}
                    <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200/80 pt-4 mt-2">
                      {/* Choose Machine */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          เลือกเครื่องเอกซเรย์ที่ตรวจ (Target Device)
                        </label>
                        <div className="flex space-x-2 bg-slate-200/60 p-1 rounded-xl border border-slate-300/40">
                          <button
                            type="button"
                            onClick={() => {
                              setFormMachine('general');
                              setItemStatuses(getDefaultStatuses('general'));
                            }}
                            className={`flex-grow py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                              formMachine === 'general'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            🖥️ <span>เครื่องทั่วไป (General)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormMachine('portable');
                              setItemStatuses(getDefaultStatuses('portable'));
                            }}
                            className={`flex-grow py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                              formMachine === 'portable'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            🛞 <span>เครื่องเคลื่อนที่ (Portable)</span>
                          </button>
                        </div>
                      </div>

                      {/* Choose Readiness Status */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          สถานะแสดงความพร้อมใช้งาน (Operational Readiness)
                        </label>
                        <div className="flex space-x-2 bg-slate-200/60 p-1 rounded-xl border border-slate-300/40">
                          <button
                            type="button"
                            onClick={() => {
                              setFormReadinessStatus('ใช้งานได้ปกติ');
                              const items = formMachine === 'portable' ? PORTABLE_QC_ITEMS : GENERAL_QC_ITEMS;
                              const updatedStatuses: { [itemId: number]: 'ผ่าน' | 'ไม่ผ่าน' } = {};
                              items.forEach(item => {
                                updatedStatuses[item.id] = 'ผ่าน';
                              });
                              setItemStatuses(updatedStatuses);
                            }}
                            className={`flex-grow py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                              formReadinessStatus === 'ใช้งานได้ปกติ'
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            🟢 <span>ใช้งานปกติ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormReadinessStatus('รอซ่อมแซม');
                              const items = formMachine === 'portable' ? PORTABLE_QC_ITEMS : GENERAL_QC_ITEMS;
                              const updatedStatuses: { [itemId: number]: 'ผ่าน' | 'ไม่ผ่าน' } = {};
                              items.forEach(item => {
                                updatedStatuses[item.id] = 'ไม่ผ่าน';
                              });
                              setItemStatuses(updatedStatuses);
                              triggerToast('ตั้งค่าผลการตรวจสอบเบื้องต้นเป็น "ไม่ผ่าน" ทุกข้อแล้ว ท่านสามารถกดเลือกข้อย่อยเพิ่มเติมได้', 'info');
                            }}
                            className={`flex-grow py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                              formReadinessStatus === 'รอซ่อมแซม'
                                ? 'bg-rose-600 text-white shadow-md'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            ⚠️ <span>รอซ่อมแซม</span>
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Checklist Section - Table with Pass / Fail Radio card style */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      รายการหัวข้อคัดกรอง 6 จุดสำคัญขั้นบังคับ (F1 Checklist)
                    </h3>

                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-700 text-xs font-bold border-b border-slate-200">
                            <th className="py-3 px-4 w-12 text-center">ข้อ</th>
                            <th className="py-3 px-4">ระบบและขั้นตอนตรวจสอบความปลอดภัย</th>
                            <th className="py-3 px-4 w-44 sm:w-56 text-center">ผลตรวจสอบประจำวัน</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {(formMachine === 'portable' ? PORTABLE_QC_ITEMS : GENERAL_QC_ITEMS).map((item) => {
                            const isPassed = itemStatuses[item.id] === 'ผ่าน';
                            const isFailed = itemStatuses[item.id] === 'ไม่ผ่าน';
                            
                            return (
                              <tr 
                                key={item.id} 
                                className={`transition-all duration-150 ${
                                  isFailed 
                                    ? 'bg-rose-50/70 hover:bg-rose-50' 
                                    : 'hover:bg-slate-50/70'
                                }`}
                              >
                                {/* Item ID */}
                                <td className="py-3.5 px-4 font-mono font-bold text-sm text-center text-slate-500">
                                  {item.id}
                                </td>

                                {/* Item Description info */}
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-sm text-slate-900">{item.title}</div>
                                  <div className="text-xs text-slate-500 font-mono mt-0.5">{item.enTitle}</div>
                                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-white/60 p-2 rounded-lg border border-slate-100">
                                    {item.description}
                                  </p>
                                </td>

                                {/* Pass / Fail Radios styled perfectly with click boxes */}
                                <td className="py-3.5 px-4 text-center">
                                  <div className="flex items-center justify-center space-x-2">
                                    {/* Pass button card */}
                                    <button
                                      type="button"
                                      onClick={() => setItemStatuses(prev => ({ ...prev, [item.id]: 'ผ่าน' }))}
                                      className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all w-20 sm:w-24 border ${
                                        isPassed 
                                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                      }`}
                                      id={`check-pass-${item.id}`}
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>ผ่าน</span>
                                    </button>

                                    {/* Fail button card */}
                                    <button
                                      type="button"
                                      onClick={() => setItemStatuses(prev => ({ ...prev, [item.id]: 'ไม่ผ่าน' }))}
                                      className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all w-20 sm:w-24 border ${
                                        isFailed 
                                          ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                                          : 'bg-white text-rose-600 border-slate-200 hover:bg-rose-50'
                                      }`}
                                      id={`check-fail-${item.id}`}
                                    >
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                      <span>ไม่ผ่าน</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Conditional Logic Section: If failed, show red warning panel and note field is required */}
                  <AnimatePresence>
                    {hasAnyFailure && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-rose-50 border-2 border-rose-500/80 rounded-xl p-5 space-y-4">
                          <div className="flex items-start space-x-3 text-rose-900" id="physicist-emergency-alert">
                            <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5 animate-bounce" />
                            <div>
                              <h4 className="font-extrabold text-sm sm:text-base">
                                ⚠️ กรุณาแจ้งนักฟิสิกส์การแพทย์หรือช่างเทคนิคเพื่อตรวจสอบทันที
                              </h4>
                              <p className="text-xs text-rose-800/90 mt-1 leading-relaxed">
                                เนื่องจากผลการทดสอบพบจุดที่บกพร่อง "ไม่ผ่านเกณฑ์" ข้อตกลงความปลอดภัยกำหนดให้ระงับการฉายรังสีจนกว่าแพทย์นักฟิสิกส์หรือวิศวกรผู้เชี่ยวชาญจะอนุมัติการเปิดใช้ระบบ
                              </p>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-1.5">
                              ระบุหมายเหตุ / สาเหตุที่พบ / บัญชีกำกับแก้ไขเบื้องต้น <span className="text-rose-600">*จำเป็น</span>
                            </label>

                            {/* ดรอปดาวน์เลือกสถานะ/หมายเหตุสำเร็จรูป */}
                            <div className="mb-2">
                              <select
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val) {
                                    setFormNotes((prev) => {
                                      // If there's already text, append nicely, otherwise overwrite
                                      if (!prev || prev.trim() === "") {
                                        return val + ": ";
                                      } else {
                                        return val + ": " + prev;
                                      }
                                    });
                                  }
                                }}
                                className="block w-full rounded-lg border-2 border-rose-300 bg-white px-2.5 py-1.5 text-xs font-bold text-rose-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                                id="notes-action-dropdown"
                              >
                                <option value="">-- ดรอปดาวน์สำหรับเลือกการดําเนินการลัด --</option>
                                <option value="แจ้งซ่อม Gen">🛠️ แจ้งซ่อม Gen (เครื่องทั่วไป)</option>
                                <option value="งดใช้งาน Gen">🛑 งดใช้งาน Gen (เครื่องทั่วไป)</option>
                                <option value="แจ้งซ่อม Por">🛠️ แจ้งซ่อม Por (เครื่องเคลื่อนที่)</option>
                                <option value="งดใช้งาน Por">🛑 งดใช้งาน Por (เครื่องเคลื่อนที่)</option>
                              </select>
                            </div>

                            <textarea
                              rows={3}
                              value={formNotes}
                              onChange={(e) => setFormNotes(e.target.value)}
                              placeholder="ตัวอย่าง: สายต่อเครื่องควบคุมขัดข้อง / ตัวเบรคข้างฐานหลวมไม่ยึดแน่น เพื่อเป็นประโยชน์ต่อนักฟิสิกส์การแพทย์"
                              className="block w-full rounded-lg border-2 border-rose-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 placeholder-rose-300"
                              required={hasAnyFailure}
                              id="form-input-notes-failed"
                            />
                            
                            <p className="text-[11px] text-rose-700 mt-1">
                              * เคล็ดลับ: คุณสามารถเลือกประเภท "แจ้งซ่อม" หรือ "งดใช้งาน" จากดรอปดาวน์ด้านบนเพื่อนำหน้าข้อความ จากนั้นเขียนพิมพ์คำอธิบายหรือเลือกติ๊กข้อย่อยเพิ่มเติมด้านบนได้สะดวก
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Normal note block if all passed */}
                  {!hasAnyFailure && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        หมายเหตุบันทึกเพิ่มเติม (ถ้ามี)
                      </label>
                      <textarea
                        rows={2}
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="กรอกข้อมูลสนับสนุน เช่น อุณหภูมิห้องเครื่องปกติ, การทำงานลื่นไหลดีเป็นพิเศษ"
                        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        id="form-input-notes-normal"
                      />
                    </div>
                  )}

                  {/* Submission and Status */}
                  <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-lg ${hasAnyFailure ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {hasAnyFailure ? <AlertTriangle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-medium">สรุปประเมินขั้นสุดท้าย</p>
                        <p className={`text-sm font-bold ${hasAnyFailure ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {hasAnyFailure ? '❌ ตรวจพบส่วนขัดข้อง (กรุณาแจ้งด่วน)' : '✅ อุปกรณ์ผ่านเกณฑ์พร้อมให้บริการ'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-white shadow-md transition-all active:scale-95 ${
                        hasAnyFailure 
                          ? 'bg-rose-600 hover:bg-rose-700 hover:shadow-rose-300/40' 
                          : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-300/40'
                      }`}
                      id="form-submit-btn"
                    >
                      {records.some(r => r.date === formDate) ? 'อัปเดตและบันทึกประวัติ' : 'บันทึกรายการประจำวันนี้'}
                    </button>
                  </div>

                </div>
              </form>

            </div>

            {/* Sidebar with dynamic details & compliance info */}
            <div className="space-y-6">
              
              {/* Quick History Checklist Table of Last 5 Submissions */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
                    <span className="w-2 h-4 bg-slate-400 rounded-full mr-2"></span>
                    ประวัติบันทึกบล็อคล่าสุด
                  </h3>
                  <button 
                    onClick={() => setActiveTab('dashboard')} 
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center"
                  >
                    ดูทั้งหมด
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>

                <div className="space-y-3">
                  {records.slice(0, 5).map((rec) => (
                    <div 
                      key={`${rec.date}-${rec.machine || 'general'}-${rec.time}-${rec.timestamp || ''}`}
                      onClick={() => {
                        setSelectedCalendarRecord(rec);
                        setActiveTab('dashboard');
                      }}
                      className="group flex items-center justify-between p-3 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-2.5 h-10 rounded-full ${rec.hasFailures ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 font-mono">{rec.date}</p>
                          <p className="text-[11px] text-slate-500">โดย: {rec.inspector} ({rec.role})</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rec.hasFailures 
                            ? 'bg-rose-100 text-rose-700' 
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {rec.hasFailures ? 'พบจุดขัดข้อง' : 'ผ่านเกณฑ์'}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {records.length === 0 && (
                    <div className="text-center py-6 text-xs text-slate-400">
                      ไม่มีประวัติรายการบันทึกในระบบ
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Dashboard and Calendar */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Dashboard Core Analytics Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">วันที่มีการบันทึก QC</div>
                <div className="flex items-baseline space-x-1.5 mt-2">
                  <span className="text-3xl font-black text-slate-900 font-mono">{totalRegisteredDays}</span>
                  <span className="text-slate-500 text-xs">/ {daysInMonthCount} วันทั้งหมด</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-2">
                  ประมวลผลสำหรับเดือน {thMonthNames[currentCalendarMonth]} {currentCalendarYear}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">สัดส่วนที่ผ่านเกณฑ์</div>
                <div className="flex items-baseline space-x-1.5 mt-2">
                  <span className="text-3xl font-black text-emerald-600 font-mono">{totalPassedDays}</span>
                  <span className="text-slate-500 text-xs">/ {totalRegisteredDays} วันที่ตรวจ</span>
                </div>
                <div className="text-[11px] text-emerald-600 font-semibold mt-2 flex items-center">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1"></span>
                  อัตราความสำเร็จ {passRatePercentage}%
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">พบชำรุด/ไม่ผ่านเกณฑ์</div>
                <div className="flex items-baseline space-x-1.5 mt-2">
                  <span className={`text-3xl font-black font-mono ${
                    currentMonthRecords.filter(r => r.hasFailures).length > 0 ? 'text-rose-600' : 'text-slate-900'
                  }`}>
                    {currentMonthRecords.filter(r => r.hasFailures).length}
                  </span>
                  <span className="text-slate-500 text-xs">ครั้ง</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-2">
                  {currentMonthRecords.filter(r => r.hasFailures).length > 0 
                    ? '⚠️ แจ้งเตือนระบบแจ้งซ่อมแล้ว' 
                    : '✅ สรุปภาพรวมไม่มีความเสี่ยง'}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">ผู้ตรวจสอบความสม่ำเสมอ</div>
                <div className="flex items-baseline space-x-1.5 mt-2">
                  <span className="text-3xl font-black text-blue-600 font-mono">
                    {Array.from(new Set(currentMonthRecords.map(r => r.inspector))).length}
                  </span>
                  <span className="text-slate-500 text-xs">คน</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-2">
                  มีส่วนร่วมในการตรวจสอบประกันประสิทธิภาพ
                </div>
              </div>

            </div>

            {/* Cloud Sync Centre Panel Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
              
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start space-x-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/50 flex-shrink-0 shadow-inner">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">ระบบแบ็คอัพสำรองข้อมูลคุณภาพ (Cloud & Google Sheets Backup)</h3>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200/60 font-sans">
                        ระบบคลาวด์ทำงาน
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      เชื่อมโยงฟอร์ม F1 เพื่อนำข้อมูลบันทึก QC ออกเป็นตารางสเปรดชีตบน Google Sheets โดยระบบจะรองรับออโต้ซิงก์ประวัติทันทีในขณะบันทึกแบบเรียลไทม์
                    </p>
                    
                    {syncedSpreadsheetId && (
                      <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs text-emerald-700 bg-emerald-50/60 px-3 py-1.5 rounded-lg border border-emerald-200 font-medium font-mono">
                        <span className="flex items-center space-x-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>สเปรดชีตเชื่อมโยงอยู่:</span>
                        </span>
                        <span className="text-[10px] text-emerald-900 bg-emerald-100/60 px-1.5 py-0.5 rounded max-w-xs truncate" title={syncedSpreadsheetId}>
                          {syncedSpreadsheetId}
                        </span>
                        {lastSyncTime && (
                          <span className="text-[10px] text-slate-450 font-normal">
                             (ปรับปรุงข้อมูลล่าสุด: {lastSyncTime} น.)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {!currentUser ? (
                    <button
                      onClick={handleGoogleSignIn}
                      className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-700 flex items-center justify-center space-x-2.5 hover:bg-slate-50 hover:shadow-sm active:scale-97 transition-all cursor-pointer shadow-sm"
                      id="google-signin-btn"
                    >
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 flex-shrink-0">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                      <span className="font-semibold text-slate-800">เชื่อมต่อบริการ Google Sheets</span>
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                      <div className="flex items-center space-x-2 border border-slate-200 bg-slate-50 rounded-xl px-3 py-1.5 shrink-0">
                        {currentUser.photoURL ? (
                          <img src={currentUser.photoURL} alt="Google profile" className="h-5 w-5 rounded-full border shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-blue-105 flex items-center justify-center text-[9px] text-blue-600 font-bold border border-blue-250 shrink-0">
                            {currentUser.displayName ? currentUser.displayName[0] : 'G'}
                          </div>
                        )}
                        <span className="text-[11px] text-slate-600 font-bold max-w-[100px] truncate" title={currentUser.displayName || currentUser.email}>
                          {currentUser.displayName || currentUser.email}
                        </span>
                        <button 
                          onClick={handleGoogleSignOut} 
                          className="text-slate-400 hover:text-rose-600 p-0.5 shrink-0 transition-colors" 
                          title="ยกเลิกการล็อกอินบัญชี Google"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {syncedSpreadsheetId && (
                          <a
                            href={`https://docs.google.com/spreadsheets/d/${syncedSpreadsheetId}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                            <span>เปิดสเปรดชีต</span>
                          </a>
                        )}

                        <button
                          onClick={() => handleSyncToSheets(false)}
                          disabled={isSyncingSheet}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-450 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-50 shrink-0 cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet ? 'animate-spin' : ''}`} />
                          <span>{isSyncingSheet ? 'กำลังซิงก์...' : syncedSpreadsheetId ? 'ซิงก์ปรับปรุงชีต' : 'สร้างและเชื่อมชีต'}</span>
                        </button>

                        {syncedSpreadsheetId && (
                          <button
                            onClick={() => {
                              if (window.confirm('คุณต้องการยกเลิกแผ่นงานปัจจุบันและสร้างแผ่นงานใหม่ใช่หรือไม่?')) {
                                handleSyncToSheets(true);
                              }
                            }}
                            disabled={isSyncingSheet}
                            className="px-2 py-2 border border-slate-200 bg-white hover:bg-slate-100 rounded-lg text-xs text-slate-450 transition-colors shrink-0"
                            title="สร้างแผ่นงานใหม่แยกต่างหาก"
                          >
                            ฟอร์ซไฟล์ใหม่
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Interactive Calendar Section */}
            <div className="w-full max-w-4xl mx-auto">
              
              {/* The Calendar Grid Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="qc-monthly-calendar-card">
                
                {/* Month Navigator Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-slate-900">
                      ปฏิทินแสดงผลประกันคุณภาพ (QC Status Calendar)
                    </h3>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={handlePrevMonth}
                      className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-all cursor-pointer bg-white border border-slate-200 flex items-center justify-center hover:shadow-sm"
                      title="เดือนก่อนหน้า"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-extrabold text-blue-750 bg-blue-50/70 border border-blue-150 px-4 py-1.5 rounded-lg font-mono min-w-[150px] text-center shadow-inner">
                      {thMonthNames[currentCalendarMonth]} พ.ศ. {currentCalendarYear + 543}
                    </span>
                    <button
                      onClick={handleNextMonth}
                      className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-all cursor-pointer bg-white border border-slate-200 flex items-center justify-center hover:shadow-sm"
                      title="เดือนถัดไป"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {/* ปุ่มแยกแท็บปฏิทินระหว่างเครื่องทั่วไปและเครื่องเคลื่อนที่ */}
                  <div className="flex items-center space-x-2 mb-5 bg-slate-100 p-1 rounded-xl border border-slate-200 print:hidden shadow-inner">
                    <button
                      onClick={() => { setSelectedMachine('general'); setSelectedCalendarRecord(null); }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-2 ${
                        selectedMachine === 'general'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      }`}
                    >
                      <span className="text-sm">🖥️</span>
                      <span>ปฏิทินเครื่องทั่วไป (General DR)</span>
                    </button>
                    <button
                      onClick={() => { setSelectedMachine('portable'); setSelectedCalendarRecord(null); }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-2 ${
                        selectedMachine === 'portable'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      }`}
                    >
                      <span className="text-sm">🛞</span>
                      <span>ปฏิทินเครื่องเคลื่อนที่ (Portable DR)</span>
                    </button>
                  </div>

                  {/* Legend guide */}
                  <div className="flex flex-wrap items-center gap-4 mb-4 text-xs font-medium text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                    <span className="text-slate-400">คำอธิบายสัญญลักษณ์:</span>
                    <span className="flex items-center">
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center mr-1 text-[8px] font-bold">✓</span>
                      ผ่านเกณฑ์ทั้งหมด (Pass)
                    </span>
                    <span className="flex items-center">
                      <span className="w-3.5 h-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center mr-1 text-[8px] font-bold">!</span>
                      พบจุดบกพร่อง/ไม่ผ่าน (Fail)
                    </span>
                    <span className="flex items-center">
                      <span className="w-3.5 h-3.5 rounded-full bg-slate-100 border border-slate-300 mr-1"></span>
                      ยังไม่มีข้อมูลตรวจ (No Record)
                    </span>
                  </div>

                  {/* Calendar Matrix */}
                  <div className="grid grid-cols-7 gap-2.5 text-center">
                    {/* Days of week */}
                    {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map((dayName, idx) => (
                      <div key={idx} className="text-xs font-bold text-slate-400 py-2">
                        {dayName}
                      </div>
                    ))}

                    {/* Pre-padding empty boxes for month start offset */}
                    {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="aspect-square rounded-xl bg-slate-50/50 border border-transparent"></div>
                    ))}

                    {/* Month Day Boxes */}
                    {Array.from({ length: daysInMonthCount }).map((_, idx) => {
                      const dayNumber = idx + 1;
                      const formattedMonth = (currentCalendarMonth + 1).toString().padStart(2, '0');
                      const dateStr = `${currentCalendarYear}-${formattedMonth}-${dayNumber.toString().padStart(2, '0')}`;
                      
                      // Match date string and machine type to records list
                      const dayRecord = records.find(r => r.date === dateStr && (r.machine || 'general') === selectedMachine);
                      const isSelected = selectedCalendarRecord?.date === dateStr;

                      return (
                        <button
                          key={`day-${dayNumber}`}
                          onClick={() => {
                            if (dayRecord) {
                              setSelectedCalendarRecord(dayRecord);
                            } else {
                              // Trigger state pre-filling for this date to record as standard
                              setSelectedCalendarRecord(null);
                              setFormDate(dateStr);
                              setActiveTab('form');
                              triggerToast(`เลือกบันทึกผลงานของวันที่ ${dateStr} เรียบร้อย`, 'info');
                            }
                          }}
                          className={`aspect-square rounded-xl p-2 flex flex-col justify-between items-center transition-all border text-left relative focus:outline-none ${
                            dayRecord 
                              ? dayRecord.hasFailures 
                                ? 'bg-rose-50 border-rose-300 hover:bg-rose-100 text-rose-900 hover:shadow-sm' 
                                : 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50 text-emerald-900 hover:shadow-sm'
                              : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-400 hover:border-slate-300'
                          } ${isSelected ? 'ring-2 ring-blue-600 ring-offset-2' : ''}`}
                          id={`calendar-day-btn-${dayNumber}`}
                        >
                          {/* Calendar date tag digits */}
                          <span className="text-xs font-black font-mono self-start">{dayNumber}</span>
                          
                          {/* Quick visual badge indicator */}
                          {dayRecord ? (
                            dayRecord.hasFailures ? (
                              <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black shadow-sm shrink-0">
                                !
                              </span>
                            ) : (
                              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shadow-sm shrink-0">
                                ✓
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] text-slate-300 font-mono tracking-tighter">ว่าง</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-slate-400 text-center mt-5">
                    * วันที่มีประวัติบันทึก QC จะแสดงสัญลักษณ์ ✓ และ ! กำกับอยู่บนปฏิทินมาตรฐานของแต่ละเครื่อง
                  </p>
                </div>
              </div>

            </div>

            {/* List Table container for Export & Report Preview */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="qc-datatable">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-950">
                    ตารางรายละเอียดความเรียบร้อยเพื่ออกรายงาน (Monthly QC Data Log)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">รวมรวบข้อมูลบันทึกทั้งหมดของระบบ DR-2026-XRG99 ประจำเดือน</p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={handleExportCSV}
                    className="px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 flex items-center space-x-1.5 transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลด CSV</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('report')}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold text-white flex items-center space-x-1.5 transition-colors shadow-md shadow-blue-100"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์รายงานสรุปผล</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-black tracking-wider text-[10px]">
                      <th className="py-3 px-4">วันที่</th>
                      <th className="py-3 px-4">เวลา</th>
                      <th className="py-3 px-4">ผู้สุ่มตรวจ (Auditor / Inspector)</th>
                      {(selectedMachine === 'portable' ? PORTABLE_QC_ITEMS : GENERAL_QC_ITEMS).map((item) => (
                        <th key={item.id} className="py-3 px-2 text-center" title={`${item.title} (${item.enTitle})`}>
                          {item.title.split(' (')[0].substring(0, 12)}
                        </th>
                      ))}
                      <th className="py-3 px-4">สถานะภาพรวม</th>
                      <th className="py-3 px-4 max-w-xs truncate">หมายเหตุ/ข้อร้องขอ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-700 font-sans">
                    {(selectedMachine === 'portable' ? PORTABLE_QC_ITEMS : GENERAL_QC_ITEMS) && currentMonthRecords.map((rec) => (
                      <tr key={`${rec.date}-${rec.machine || 'general'}-${rec.time}-${rec.timestamp || ''}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold font-mono text-slate-900">{rec.date}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{rec.time} น.</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800">{rec.inspector}</span>
                          <span className="ml-1 text-[10px] text-slate-500 bg-slate-200/70 px-1 py-0.5 rounded font-mono font-bold">
                            {rec.role}
                          </span>
                        </td>
                        {(selectedMachine === 'portable' ? PORTABLE_QC_ITEMS : GENERAL_QC_ITEMS).map((item) => {
                          const status = rec.results[item.id];
                          return (
                            <td key={item.id} className="py-3 px-2 text-center">
                              <span className={status === 'ผ่าน' ? 'text-emerald-600 font-bold' : status === 'ไม่ผ่าน' ? 'text-rose-600 font-black' : 'text-slate-350'}>
                                {status || '—'}
                              </span>
                            </td>
                          );
                        })}
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            rec.hasFailures 
                              ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {rec.hasFailures ? '❌ ไม่ผ่านเกณฑ์' : '✅ ผ่านสมบูรณ์'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-500 max-w-xs truncate" title={rec.notes}>
                          {rec.notes || '—'}
                        </td>
                      </tr>
                    ))}
                    
                    {currentMonthRecords.length === 0 && (
                      <tr>
                        <td colSpan={5 + (selectedMachine === 'portable' ? PORTABLE_QC_ITEMS : GENERAL_QC_ITEMS).length} className="py-12 text-center text-slate-400 font-medium">
                          ไม่มีข้อมูลบันทึกในเดือนนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Tab 3: Official Medical Physics Signoff Report View (Perfect for standard A4 Printing) */}
        {activeTab === 'report' && (
          <div className="space-y-6">
            {/* Guide Info Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-55 border border-blue-150 rounded-2xl p-4 text-xs text-blue-900 flex items-start space-x-3 shadow-xs print:hidden">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">📝 การตรวจสอบและระบบลงลายเซ็นดิจิทัล:</p>
                <p className="text-slate-650 leading-relaxed">
                  ท่านสามารถลงลายมือชื่อดิจิทัลสำหรับ <strong>"ผู้ส่งรายงานประจำวัน"</strong> และ <strong>"นักฟิสิกส์ผู้รับรอง"</strong> คล้ายกับการเซ็นแผ่นกระดาษจริงได้ทันทีบนโทรศัพท์มือถือ แท็บเล็ต หรือเมาส์ โดยข้อมูลลายเซ็นจะฝังเข้าจุดลายเซ็นในรายงานโดยอัตโนมัติ และรองรับการเซฟเป็นไฟล์ PDF ลายลักษณ์อักษรได้สมบูรณ์แบบ
                </p>
              </div>
            </div>

            {/* Interactive Digital Signing Panel (Hidden in print) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
              {/* Operator Signature controls */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full font-sans">
                      ส่วนที่ 1: ผู้รับผิดชอบประกันคุณภาพ
                    </span>
                    <h4 className="font-bold text-slate-800 text-xs mt-1.5 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-blue-600" />
                      <span>ลงชื่อผู้ส่งรายงานประจำวัน</span>
                    </h4>
                  </div>
                  {operatorSig ? (
                    <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-150">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                      ลงชื่อสำเร็จ
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-150">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1"></span>
                      รอลายมือชื่อ
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-xs space-y-1">
                  <p className="text-slate-700 font-semibold flex items-center justify-between">
                    <span>ระบุชื่อ: <strong className="text-blue-900 font-sans">{operatorName}</strong></span>
                    <span className="text-[10px] text-slate-400">เจ้าพนักงานรัฐ</span>
                  </p>
                  <p className="text-slate-500 text-[10px]">ตรวจสอบเมื่อ: {operatorDate}</p>
                  
                  {operatorSig ? (
                    <div className="mt-2 border border-slate-200 bg-white rounded-lg p-1 flex items-center justify-center h-14 shadow-2xs">
                      <img src={operatorSig} alt="Operator Signature" className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <div className="mt-2 border border-dashed border-slate-200 rounded-lg p-3 text-center text-[11px] text-slate-400 bg-white italic">
                      ยังไม่มีข้อมูลภาพลายเซ็น
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={() => {
                      setSigModalType('operator');
                      setIsSigModalOpen(true);
                    }}
                    className="flex-grow py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>✍️ ลงลายเซ็นอิเล็กทรอนิกส์</span>
                  </button>
                  {operatorSig && (
                    <button
                      onClick={() => handleClearSignature('operator')}
                      className="px-3 py-2 border border-slate-200 hover:bg-rose-50 rounded-lg hover:border-rose-200 text-rose-600 text-xs transition-colors cursor-pointer"
                    >
                      ล้าง
                    </button>
                  )}
                </div>
              </div>

              {/* Physicist Signature controls */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full font-sans">
                      ส่วนที่ 2: ผู้รับรับรองสถิติประจำเดือน
                    </span>
                    <h4 className="font-bold text-slate-800 text-xs mt-1.5 flex items-center gap-1.5">
                      <ClipboardCheck className="w-4 h-4 text-purple-600" />
                      <span>ลงชื่อผู้รับรองรายงาน (Physicist)</span>
                    </h4>
                  </div>
                  {physicistSig ? (
                    <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-150">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                      รับรองสำเร็จ
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-150">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1"></span>
                      รอผู้รับรองสถิติ
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-xs space-y-1">
                  <p className="text-slate-700 font-semibold flex items-center justify-between">
                    <span>ระบุชื่อ: <strong className="text-purple-900 font-sans">{physicistName}</strong></span>
                    <span className="text-[10px] text-slate-400">หัวหน้างานรังสีวิทยา</span>
                  </p>
                  <p className="text-slate-500 text-[10px]">อนุมัติลงรับรอง: {physicistDate}</p>
                  
                  {physicistSig ? (
                    <div className="mt-2 border border-slate-200 bg-white rounded-lg p-1 flex items-center justify-center h-14 shadow-2xs">
                      <img src={physicistSig} alt="Physicist Signature" className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <div className="mt-2 border border-dashed border-slate-200 rounded-lg p-3 text-center text-[11px] text-slate-400 bg-white italic">
                      ยังไม่มีข้อมูลภาพลายเซ็นผู้รับรอง
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={() => {
                      setSigModalType('physicist');
                      setIsSigModalOpen(true);
                    }}
                    className="flex-grow py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>✍️ ลงลายชื่อผู้ตรวจรับรอง</span>
                  </button>
                  {physicistSig && (
                    <button
                      onClick={() => handleClearSignature('physicist')}
                      className="px-3 py-2 border border-slate-200 hover:bg-rose-50 rounded-lg hover:border-rose-200 text-rose-600 text-xs transition-colors cursor-pointer"
                    >
                      ล้าง
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Print and Export Dual Actions Layout Control Panel */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800 print:hidden font-sans">
              <div className="flex items-center space-x-3.5">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs">จัดเก็บเอกสารอย่างเป็นทางการ</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">เซฟรายงานครบถ้วนเป็น PDF แผ่นเดียว หรือพิมพ์ใส่กระดาษขนาดมาตรฐาน A4</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  disabled={isExportingPDF}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-emerald-950/50"
                >
                  {isExportingPDF ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังเขียนไฟล์ PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>บันทึกชื่อเซฟเป็น PDF</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์รายงานโดยใช้เครื่องพิมพ์</span>
                </button>
              </div>
            </div>

            {isInIframe && (
              <div className="p-4 bg-indigo-50 border border-indigo-150 rounded-2xl text-[11px] text-indigo-900 leading-relaxed print:hidden max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-indigo-950 text-xs">
                    💡 <span>คำแนะนำเพื่อการพิมพ์รายงานและการลงลายเซ็นที่ละเอียดที่สุด:</span>
                  </p>
                  <p className="text-slate-650 leading-relaxed max-w-3xl">
                    เนื่องจากเบราว์เซอร์จำกัดการพิมพ์และการจัดเก็บไฟล์เวกเตอร์บน iFrame ของระบบ AI Studio คุณสามารถคลิกปุ่มสีส้มขวามือเพื่อเปิดแอปพลิเคชันอย่างเป็นทางการแบบเต็มหน้าจอ (Full Tab) ซึ่งจะสามารถพิมพ์รายงานหรือสั่งบันทึก PDF เป็นเวกเตอร์คมชัด 100% ได้ทันที
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="w-full sm:w-auto px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-orange-200 cursor-pointer shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เปิดแอปในแท็บใหม่ (Open App in New Tab)</span>
                </button>
              </div>
            )}

            {/* Printable Report Worksheet (Looks exactly like a professional clinical document) */}
            <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-xl p-8 sm:p-12 print:border-none print:shadow-none print:p-0" id="print-area">
              
              {/* Header block with government spacing style */}
              <div className="text-center space-y-2 border-b-2 border-double border-slate-750 pb-6 print:pb-4">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-widest font-mono">
                  เอกสารบันทึกมาตรฐานงานทางรังสีวิทยา
                </p>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  รายงานสรุปการตรวจวิเคราะห์และทดสอบคุณภาพรังสีประจำวัน (Form F1)
                </h2>
                <p className="text-sm text-slate-700">
                  เครื่องเอกซเรย์ทั่วไปชนิดดิจิทัล (Digital Radiography Standard Quality Control Statement)
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-xs text-slate-500 font-mono pt-1">
                  <span><strong>อุปกรณ์เป้าหมาย:</strong> X-Ray Tube DR-01</span>
                  <span className="hidden sm:inline">•</span>
                  <span><strong>รหัสตรวจสอบ:</strong> QA-DR-SYS-XRG99</span>
                  <span className="hidden sm:inline">•</span>
                  <span><strong>รอบเดือนสรุป:</strong> {thMonthNames[currentCalendarMonth]} พ.ศ. {currentCalendarYear + 543}</span>
                </div>
              </div>

              {/* High level metrics metadata box */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-b border-slate-200 text-slate-800">
                <div className="p-3 bg-slate-50 rounded-lg text-center border border-slate-150">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">จำนวนการตรวจสอบสะสม</span>
                  <span className="text-xl font-mono font-bold text-slate-900">{totalRegisteredDays} วัน</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center border border-slate-150">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">ผ่านมาตรฐานสมบูรณ์ (Pass)</span>
                  <span className="text-xl font-mono font-bold text-emerald-700">{totalPassedDays} วัน</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center border border-slate-150">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">ตรวจพบขัดข้อง (Fail)</span>
                  <span className="text-xl font-mono font-bold text-rose-600">{currentMonthRecords.filter(r => r.hasFailures).length} วัน</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center border border-slate-150">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">ร้อยละความสม่ำเสมอสุทธิ</span>
                  <span className="text-xl font-mono font-bold text-indigo-700">{passRatePercentage}%</span>
                </div>
              </div>

              {/* Items Summary descriptions list */}
              <div className="py-6 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span>สรุปสถิติจุดปลอดภัยแยกตามหัวข้อการตรวจ</span>
                  <span>(เกณฑ์ขั้นต่ำ {totalRegisteredDays}/{totalRegisteredDays} ครั้ง)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs text-slate-700">
                  {(selectedMachine === 'portable' ? PORTABLE_QC_ITEMS : GENERAL_QC_ITEMS).map((item) => {
                    const failCount = currentMonthRecords.filter(r => r.results[item.id] === 'ไม่ผ่าน').length;
                    const passCount = currentMonthRecords.filter(r => r.results[item.id] === 'ผ่าน').length;
                    const successRate = totalRegisteredDays > 0 ? ((passCount / totalRegisteredDays) * 100).toFixed(0) : '0';

                    return (
                      <div key={item.id} className="p-3 rounded-lg border border-slate-150 bg-slate-50/40 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-800">{item.id}. {item.title.split(' (')[0]}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{item.enTitle}</p>
                        </div>
                        <div className="text-right font-mono font-bold">
                          <p className="text-blue-800">{passCount}/{totalRegisteredDays} ผ่าน</p>
                          <p className={`text-[10px] ${failCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                            ชำรุด {failCount} ครั้ง ({successRate}%)
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Document table log listing */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-1.5">
                  ตารางบันทึกการประเมินประจำวันในรอบเดือนแบบละเอียด (Monthly Evaluation Details)
                </h4>

                <table className="w-full text-left border-collapse text-[9px] font-sans">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 text-slate-800 font-bold">
                      <th className="py-1.5 px-2">วันที่</th>
                      <th className="py-1.5 px-2">เวลา</th>
                      <th className="py-1.5 px-2">ชื่อผู้สุ่มตรวจสอบ</th>
                      {(selectedMachine === 'portable' ? PORTABLE_QC_ITEMS : GENERAL_QC_ITEMS).map((item) => (
                        <th key={item.id} className="py-1.5 px-2 text-center" title={`${item.title} (${item.enTitle})`}>
                          {item.title.split(' (')[0].substring(0, 10)}
                        </th>
                      ))}
                      <th className="py-1.5 px-2 text-right">มติสรุปผล</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {currentMonthRecords.map((rec) => (
                      <tr key={`${rec.date}-${rec.machine || 'general'}-${rec.time}-${rec.timestamp || ''}`} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2 font-bold font-mono">{rec.date}</td>
                        <td className="py-1.5 px-2 font-mono text-slate-600">{rec.time}</td>
                        <td className="py-1.5 px-2 font-medium">
                          {rec.inspector} <span className="text-[8px] bg-slate-200 px-1 py-0.2 rounded font-mono font-bold text-slate-600 ml-1">{rec.role}</span>
                        </td>
                        {(selectedMachine === 'portable' ? PORTABLE_QC_ITEMS : GENERAL_QC_ITEMS).map((item) => {
                          const status = rec.results[item.id];
                          return (
                            <td key={item.id} className="py-1.5 px-2 text-center font-bold">
                              <span className={status === 'ผ่าน' ? 'text-emerald-700' : status === 'ไม่ผ่าน' ? 'text-rose-600' : 'text-slate-400'}>
                                {status || '—'}
                              </span>
                            </td>
                          );
                        })}
                        <td className="py-1.5 px-2 text-right font-bold">
                          <span className={rec.hasFailures ? 'text-rose-600' : 'text-slate-800'}>
                            {rec.hasFailures ? 'ไม่ผ่านเกณฑ์/งดชั่วคราว' : 'ผ่านตามเกณฑ์'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Formal Medical Quality Assurance Signature Lines */}
              <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-12 pt-8 border-t border-slate-300 text-xs text-slate-800 break-inside-avoid">
                
                {/* Operator signature space */}
                <div className="space-y-3 pt-4 flex flex-col items-center">
                  <div className="text-center font-bold underline mb-1 text-slate-700">ผู้รับผิดชอบการประกันคุณภาพประจำวัน</div>
                  
                  {/* Digital Signature Slot */}
                  <div className="h-16 flex items-end justify-center relative w-2/3 border-b border-slate-400 pb-1">
                    {operatorSig ? (
                      <img src={operatorSig} alt="Signature Operator" className="max-h-14 max-w-full object-contain mix-blend-multiply" />
                    ) : (
                      <span className="text-[10px] text-slate-400 italic print:hidden">(ไม่ได้เซ็นลายเซ็นดิจิทัล)</span>
                    )}
                  </div>

                  <div className="text-center text-slate-600 space-y-1">
                    <p className="font-semibold">
                      ({operatorSig ? operatorName : '....................................................................'})
                    </p>
                    <p className="text-[11px]">เจ้าพนักงาน / พนักงานการแพทย์และรังสีเทคนิคผู้ส่งประเมิน</p>
                    <p className="text-[10px] font-mono mt-1 text-slate-500 font-sans">
                      วันที่ตรวจรายงาน: {operatorSig ? operatorDate : '......./......./.......'}
                    </p>
                  </div>
                </div>

                {/* Medical physicist counter signature space */}
                <div className="space-y-3 pt-4 flex flex-col items-center">
                  <div className="text-center font-bold underline mb-1 text-slate-700">ผู้รับรองสถิติ (Physicist)</div>
                  
                  {/* Digital Signature Slot */}
                  <div className="h-16 flex items-end justify-center relative w-2/3 border-b border-slate-400 pb-1">
                    {physicistSig ? (
                      <img src={physicistSig} alt="Signature Physicist" className="max-h-14 max-w-full object-contain mix-blend-multiply" />
                    ) : (
                      <span className="text-[10px] text-slate-400 italic print:hidden">(ไม่ได้เซ็นลายเซ็นดิจิทัล)</span>
                    )}
                  </div>

                  <div className="text-center text-slate-600 space-y-1">
                    <p className="font-semibold">
                      ({physicistSig ? physicistName : '....................................................................'})
                    </p>
                    <p className="text-[11px]">หัวหน้างานรังสีวิทยา</p>
                    <p className="text-[10px] font-mono mt-1 text-slate-500 font-sans">
                      ได้รับการอนุมัติลงรับรองประจำเดือน ณ วันที่: {physicistSig ? physicistDate : '......./......./.......'}
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

      </main>

      {/* Hospital Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800 mt-12 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="font-medium">
              Daily QC System Form F1 • โรงพยาบาลแม่ทา
            </span>
          </div>
          <div>
            <span className="font-mono text-[11px] text-slate-500">
              © 2026 Medical Physics & Engineering Unit. All Rights Reserved.
            </span>
          </div>
        </div>
      </footer>

      {/* Touch-enabled Signature Modal for drawing / clearing electronic signatures */}
      <SignatureModal
        isOpen={isSigModalOpen}
        onClose={() => {
          setIsSigModalOpen(false);
          setSigModalType(null);
        }}
        onSave={handleSaveSignature}
        initialName={sigModalType === 'operator' ? operatorName : physicistName}
        initialDate={sigModalType === 'operator' ? operatorDate : physicistDate}
        title={sigModalType === 'operator' ? 'ลงลายมือชื่อผู้ร่วมรับผิดชอบประจำวัน' : 'ผู้รับรองสถิติ (Physicist) สรุปประจำเดือน'}
        roleLabel={sigModalType === 'operator' ? 'เจ้าพนักงาน / พนักงานการแพทย์และรังสีเทคนิคผู้ส่งประเมิน (โรงพยาบาลแม่ทา)' : 'หัวหน้างานรังสีวิทยา (Physicist / Medical Physicist)'}
      />
    </div>
  );
}
