export type InspectorRole = 'จพง' | 'พนง' | 'คนงาน';

export interface QCItem {
  id: number;
  title: string;
  enTitle: string;
  description: string;
}

export const GENERAL_QC_ITEMS: QCItem[] = [
  {
    id: 1,
    title: "สายไฟ (Cables/Power Cords)",
    enTitle: "Power cords and cables inspection",
    description: "ตรวจสอบรอยแตก รอยหักงอ หรือการกดทับของสายเคเบิลสะกดทุกจุด"
  },
  {
    id: 2,
    title: "ระบบล็อคและเบรค (Locks and Brakes)",
    enTitle: "Mechanical locks & electromagnetic brakes status",
    description: "ตรวจสอบระบบล็อคทุกตำแหน่ง (ล็อคเตียง, ล็อคคอลัมน์หลอด, ล็อคแผงรับภาพ) และการหยุดสนิท"
  },
  {
    id: 3,
    title: "เตียงเอกซเรย์ (X-ray Table)",
    enTitle: "X-ray tabletop and floating mechanism stability",
    description: "ตรวจสอบความสะอาดของผิวเตียงและการเคลื่อนที่ที่ลื่นไหล ไม่มีเสียงดังรบกวน"
  },
  {
    id: 4,
    title: "หลอดเอกซเรย์ (X-ray Tube Assembly)",
    enTitle: "X-ray tube casing and collimator integrity",
    description: "ตรวจสอบสภาพภายนอก หลอดไฟบอกตำแหน่งลำรังสี ความมั่นคงแข็งแรง และไม่มีคราบน้ำมันซึม"
  },
  {
    id: 5,
    title: "บัคกี้ (Bucky)",
    enTitle: "Bucky tray, grid movement and receptor lock",
    description: "ตรวจสอบการเคลื่อนที่ของตะแกรง (Grid) และตัวล็อคแผ่นรับภาพ ตะแกรงเคลื่อนไหวได้ปกติ"
  },
  {
    id: 6,
    title: "X-ray Tube Warm-up",
    enTitle: "Tube heating and initial exposure verification",
    description: "ยืนยันว่าได้ดำเนินขั้นตอนอุ่นหลอด (Warm-up procedure) ตามสเปกผู้ผลิตเรียบร้อยแล้ว"
  }
];

export const PORTABLE_QC_ITEMS: QCItem[] = [
  {
    id: 1,
    title: "ตรวจสอบระบบล็อคทั้งหมด",
    enTitle: "Verify all locking mechanisms and locks",
    description: "ตรวจสอบระบบล๊อคของเสา แขน คอลัมน์ และปุ่มยึดแน่นต่างๆ ไม่หลวมคลอน"
  },
  {
    id: 2,
    title: "ตรวจสอบเบรกรถ (ห้ามล้อ)",
    enTitle: "Inspect carriage brakes & wheel locks",
    description: "ตรวจสอบระบบเบรคของรถเคลื่อนที่ ห้ามล้อได้สนิท ยึดเกาะแน่น ไม่ลื่นไถลขณะจอด"
  },
  {
    id: 3,
    title: "ตรวจสอบแขนที่ควบคุมการเคลื่อนไหว",
    enTitle: "Inspect articulating tube support arm",
    description: "ตรวจสอบการปรับเลื่อนขึ้น-ลง ยืด-หด ของแขนประคองหลอดเอกซเรย์ มีแรงดึงสมดุลและปลอดภัย"
  },
  {
    id: 4,
    title: "ตรวจสอบเครื่องจำกัดลำรังสีเกี่ยวกับการใช้",
    enTitle: "Inspect collimator mechanics & rotation",
    description: "ตรวจสอบกลไกการหมุนปรับขนาดใบมีดบีบลำแสง (Collimator Blade) เลื่อนได้คล่องแคล่วไม่ติดขัด"
  },
  {
    id: 5,
    title: "สายไฟฟ้ามีรอยฉีกขาดและงอผิดปกติ",
    enTitle: "Power lines with tearing and twists status",
    description: "ตรวจสอบสายนำไฟฟ้าต่าง ๆ สายตลับควบคุม ไม่มีรยางค์ชำรุด ไม่มีฉนวนหุ้มปริฉีก หรือการงอตัวผิดปกติ"
  },
  {
    id: 6,
    title: "รอยแตกหักของสวิตซ์ไฟฟ้า",
    enTitle: "Electrical switches physical condition",
    description: "ตรวจสอบทางกายภาพของสวิตซ์ปุ่มกดตามตัวเครื่องและปุ่มยิงรังสี ไม่มีมุมแตก ร่วน หรือยุบตัวชำรุด"
  },
  {
    id: 7,
    title: "สายไฟฟ้าเข้าเครื่อง",
    enTitle: "Main power intake cable status",
    description: "ตรวจสอบสายไฟฟ้าเมนหลักสำหรับเสียบชาร์จ/จ่ายไฟเข้าตัวเครื่อง แน่น แข็งแรง ฉนวนหุ้มสมบูรณ์"
  },
  {
    id: 8,
    title: "ปลั๊กและช่องเสียบมีรอยขาดหรือบิด",
    enTitle: "Plug & socket damage, bent pins check",
    description: "ตรวจสอบขาปลั๊กไฟและเต้ารับบนรถ ชิ้นส่วนพลาสติกไม่มีรอยแตกร้าว ขาปลั๊กไม่บิดงอหรือดำคล้ำ"
  },
  {
    id: 9,
    title: "ตรวจสอบเครื่องจำกัดพื้นที่แสงใช้งานได้",
    enTitle: "Verify collimator light field is functional",
    description: "กดปุ่มเพื่อยืนยันว่าหลอดไฟส่องนำพื้นที่จำกัดรังสีเปิดสว่างปกติ และสามารถมองเห็นขอบแสงได้ชัดเจน"
  },
  {
    id: 10,
    title: "แผงควบคุมทั้งหมดแสดงสถานะถูกต้อง",
    enTitle: "Check control panels output displays",
    description: "ตรวจสอบจอแสดงผลดิจิทัลหรือแผงสถานะ แสดงผลตัวเลขค่าพารามิเตอร์รังสี (kV, mAs) ครบถ้วนชัดเจน"
  },
  {
    id: 11,
    title: "สวิตซ์ทั้งหมดแน่นและทำงานได้",
    enTitle: "Ensure all toggle/press switches function",
    description: "ตรวจสอบสวิตซ์ควบคุม แผงสัมผัสการเปิด-ปิด ทำงานแม่นยำ ไม่ติดขัดหรือค้างคลอน"
  },
  {
    id: 12,
    title: "มาตรวัดทำงานได้",
    enTitle: "Verify meters & charge indicators works",
    description: "ตรวจสอบมาตรแสดงระดับแบตเตอรี่ (Battery gauge) และมาตรวัดกระแสชาร์จแสดงผลถูกต้องตามจริง"
  },
  {
    id: 13,
    title: "เครื่องฉายรังสีทำงานเมื่อกดปุ่มลง",
    enTitle: "X-ray exposure function when pressed",
    description: "ปุ่มกดฉายรังสี (Hand switch) ทำงานปกติเมื่อกด 2 จังหวะ (Prepare & Expose) มีสัญญาณเสียง/ไฟเตือน"
  }
];

export const MANDATORY_QC_ITEMS: QCItem[] = GENERAL_QC_ITEMS;

export interface DailyQCResult {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  inspector: string; // Inspector name
  role: InspectorRole; // Inspector role
  results: { [itemId: number]: 'ผ่าน' | 'ไม่ผ่าน' };
  notes: string;
  hasFailures: boolean;
  timestamp: number;
  machine?: 'general' | 'portable'; // New: 'general' or 'portable'
  readinessStatus?: 'ใช้งานได้ปกติ' | 'รอซ่อมแซม'; // New: 'ใช้งานได้ปกติ' or 'รอซ่อมแซม'
}
