import { DailyQCResult, InspectorRole } from './types';

export function generateMockRecords(targetYear?: number, targetMonth?: number): DailyQCResult[] {
  const records: DailyQCResult[] = [];
  const inspectors = [
    { name: 'สิทธิศักดิ์ เลาหกุล', role: 'จพง' as InspectorRole },
    { name: 'ต้อม', role: 'พนง' as InspectorRole },
    { name: 'เวรเปล', role: 'คนงาน' as InspectorRole },
    { name: 'ธีรพล เตจ๊ะเสาร์', role: 'พนง' as InspectorRole }
  ];

  const now = new Date();
  const year = targetYear !== undefined ? targetYear : now.getFullYear();
  const month = targetMonth !== undefined ? targetMonth : (now.getMonth() + 1); // 1-based

  const yearStr = year.toString();
  const monthStr = month.toString().padStart(2, '0');

  // Let's generate records from Day 1 to Day 15 of the target month
  const limitDay = 15;

  // 1. Generate General X-ray records
  for (let day = 1; day <= limitDay; day++) {
    const dateStr = `${yearStr}-${monthStr}-${day.toString().padStart(2, '0')}`;
    const inspector = inspectors[day % inspectors.length];
    
    // Day 12 will have a fail condition
    const isDay12 = day === 12;
    
    const results: { [itemId: number]: 'ผ่าน' | 'ไม่ผ่าน' } = {
      1: 'ผ่าน',
      2: isDay12 ? 'ไม่ผ่าน' : 'ผ่าน',
      3: 'ผ่าน',
      4: 'ผ่าน',
      5: 'ผ่าน',
      6: 'ผ่าน'
    };

    records.push({
      date: dateStr,
      time: '08:15',
      inspector: inspector.name,
      role: inspector.role,
      results,
      notes: isDay12 ? 'ตัวล็อคมุมสายเคเบิลสะกดค้างชั่วขณะ ได้ปรับตำแหน่งใหม่และหยอดสารหล่อลื่น' : '',
      hasFailures: isDay12,
      timestamp: new Date(`${dateStr}T08:15:00`).getTime(),
      machine: 'general',
      readinessStatus: isDay12 ? 'รอซ่อมแซม' : 'ใช้งานได้ปกติ'
    });
  }

  // 2. Generate Portable X-ray records
  for (let day = 1; day <= limitDay; day++) {
    const dateStr = `${yearStr}-${monthStr}-${day.toString().padStart(2, '0')}`;
    const inspector = inspectors[(day + 1) % inspectors.length];
    
    // Day 7 lives and 14 have fail conditions for Portable
    const isDay7 = day === 7;
    const isDay14 = day === 14;
    
    const results: { [itemId: number]: 'ผ่าน' | 'ไม่ผ่าน' } = {};
    for (let i = 1; i <= 13; i++) {
      results[i] = 'ผ่าน';
    }
    
    if (isDay7) {
      results[12] = 'ไม่ผ่าน'; // มาตรวัด / แบตเตอรี่
    }
    if (isDay14) {
      results[2] = 'ไม่ผ่าน'; // เบรกรถ/ล้อ
    }

    let notes = '';
    if (isDay7) {
      notes = 'แบตเสื่อมแต่ยังถ่ายภาพได้ตามปกติ ประสานงานขอเปลี่ยนอะไหล่แล้ว';
    } else if (isDay14) {
      notes = 'ยางหุ้มล้อเคลื่อนที่หลุดออกชั่วคราว ดำเนินการสวมกลับคืนเบื้องต้น';
    }

    records.push({
      date: dateStr,
      time: '09:00',
      inspector: inspector.name,
      role: inspector.role,
      results,
      notes,
      hasFailures: isDay7 || isDay14,
      timestamp: new Date(`${dateStr}T09:00:00`).getTime(),
      machine: 'portable',
      readinessStatus: (isDay7 || isDay14) ? 'รอซ่อมแซม' : 'ใช้งานได้ปกติ'
    });
  }

  return records;
}

