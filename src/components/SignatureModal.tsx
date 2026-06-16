import React, { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, Check, SquarePen } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string, name: string, date: string) => void;
  initialName: string;
  initialDate: string;
  title: string;
  roleLabel: string;
}

export default function SignatureModal({
  isOpen,
  onClose,
  onSave,
  initialName,
  initialDate,
  title,
  roleLabel,
}: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [fullName, setFullName] = useState(initialName);
  const [sigDate, setSigDate] = useState(initialDate);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Sync initial inputs when modal opens or initial values change
  useEffect(() => {
    if (isOpen) {
      setFullName(initialName);
      setSigDate(initialDate);
      setHasDrawn(false);
      // Wait for DOM to render canvas and setup sizes
      setTimeout(() => {
        initCanvas();
      }, 100);
    }
  }, [isOpen, initialName, initialDate]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Support High-DPI screens
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Style the pen line
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e3a8a'; // Royal Deep Blue ink
    ctx.lineWidth = 2.5;

    // Reset drawn flag
    setHasDrawn(false);
  };

  // Helper to get coordinates
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Check if it is a touch event
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent scrolling on touch screens
    if (e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (e.cancelable) {
      e.preventDefault();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let dataUrl = '';
    if (hasDrawn) {
      // Resize back or just export what is in the canvas
      dataUrl = canvas.toDataURL('image/png');
    }

    onSave(dataUrl, fullName, sigDate);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-all animate-fade-in font-sans">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col transform transition-transform animate-scale-up">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <SquarePen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wide">{title}</h2>
              <p className="text-[10px] text-slate-400 font-medium">ระบบลงนามอิเล็กทรอนิกส์ลายเซ็นดิจิทัล</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 flex-grow overflow-y-auto">
          {/* Inspector Role indicator */}
          <div className="bg-blue-50/60 border border-blue-150 rounded-xl p-3 text-xs text-blue-800 flex flex-col gap-0.5">
            <span className="font-semibold">ลงนามฐานะ:</span>
            <span className="text-[11px] text-blue-900 font-mono">{roleLabel}</span>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ชื่อ-นามสกุลผู้ตรวจสอบจริง <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="กรอกชื่อและนามสกุล"
                className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500 bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                วันที่ตรวจรับรองรายงาน <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={sigDate}
                onChange={(e) => setSigDate(e.target.value)}
                placeholder="เช่น 21/05/2569"
                className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500 bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          {/* Canvas Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                วาดลายเซ็นหน้าจอ <span className="text-slate-400 font-normal">(ใช้นิ้วหรือปากกา / เมาส์ลากเขียน)</span>
              </span>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center space-x-1 hover:bg-rose-50 px-2 py-1 rounded transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>ล้างลายเซ็น</span>
              </button>
            </div>

            <div className="relative border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-slate-50/50 h-44">
              {/* Grid background style for drawing reference */}
              <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]"></div>
              
              {/* Instruction baseline guide */}
              <div className="absolute bottom-12 inset-x-0 flex flex-col items-center pointer-events-none py-1 border-b border-blue-200/50">
                <span className="text-[10px] text-blue-400 font-medium tracking-wide">เซ็นเหนือเส้นตรงนี้ / Pen Signature Area</span>
              </div>

              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="absolute inset-0 w-full h-full cursor-crosshair touch-none z-1"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!fullName}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md shadow-blue-100"
          >
            <Check className="w-4 h-4" />
            <span>ยืนยันบันทึกลายเซ็น</span>
          </button>
        </div>
      </div>
    </div>
  );
}
