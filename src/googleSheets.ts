import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import firebaseConfigLocal from '../firebase-applet-config.json';
import { DailyQCResult, GENERAL_QC_ITEMS, PORTABLE_QC_ITEMS } from './types';

// Let's support both AI Studio's dynamic config and GitHub/Vercel standard VITE_ env variables
const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: firebaseConfigLocal.apiKey || metaEnv.VITE_FIREBASE_API_KEY || "",
  authDomain: firebaseConfigLocal.authDomain || metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: firebaseConfigLocal.projectId || metaEnv.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: firebaseConfigLocal.storageBucket || metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: firebaseConfigLocal.messagingSenderId || metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: firebaseConfigLocal.appId || metaEnv.VITE_FIREBASE_APP_ID || ""
};

// Initialize the Firebase app
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Request Google Sheets and Google Drive File scopes
export const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

/**
 * Initializes the authentication listener.
 */
export const initAuth = (
  onAuthSuccess: (user: User, token: string) => void,
  onAuthFailure: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If logged in but token is not in memory (e.g. page reload),
        // we ask user to re-sign-in to get a fresh token for Sheets API.
        onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure();
    }
  });
};

/**
 * Triggers the Google provider popup to sign in.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('ไม่ได้รับ Access Token จากการเข้าสู่ระบบ Google');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign-in Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Logs the user out from Firebase Auth.
 */
export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Checks or obtains the cached access token.
 */
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Creates a brand new Google Sheet and populates it with existing F1 records.
 */
export const createAndPopulateSheet = async (
  accessToken: string,
  records: DailyQCResult[],
  monthName: string,
  yearBE: number,
  selectedMachine: 'general' | 'portable' = 'general'
): Promise<string> => {
  // 1. Create the spreadsheet with two separate tabs initialized
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `ระบบสำรองข้อมูลคุณภาพเครื่องเอกซเรย์ (รพ.แม่ทา) - ${monthName} ${yearBE}`,
      },
      sheets: [
        {
          properties: {
            title: 'เครื่องทั่วไป (General DR)'
          }
        },
        {
          properties: {
            title: 'เครื่องเคลื่อนที่ (Portable DR)'
          }
        }
      ]
    }),
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`สร้างสเปรดชีตไม่สำเร็จ: ${errorDetails}`);
  }

  const sheetInfo = await response.json();
  const spreadsheetId = sheetInfo.spreadsheetId;

  // 2. Populate both sheets of the spreadsheet with customized layout
  await writeRecordsToSheet(accessToken, spreadsheetId, records, monthName, yearBE, selectedMachine);

  return spreadsheetId;
};

/**
 * Overwrites / writes data to a specific spreadsheet ID.
 */
export const writeRecordsToSheet = async (
  accessToken: string,
  spreadsheetId: string,
  records: DailyQCResult[],
  monthName: string,
  yearBE: number,
  selectedMachine: 'general' | 'portable' = 'general'
) => {
  // Fetch workbook to find existing sheets dynamically
  let sheets: any[] = [];
  try {
    const metaResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });
    if (metaResponse.ok) {
      const meta = await metaResponse.json();
      sheets = meta.sheets || [];
    }
  } catch (metaErr) {
    console.warn('Failed to fetch spreadsheet metadata, fallback to empty', metaErr);
  }

  // Ensure 'เครื่องทั่วไป (General DR)' and 'เครื่องเคลื่อนที่ (Portable DR)' exist in the workbook
  const generalTitle = 'เครื่องทั่วไป (General DR)';
  const portableTitle = 'เครื่องเคลื่อนที่ (Portable DR)';

  let generalSheet = sheets.find(s => s.properties?.title === generalTitle);
  let portableSheet = sheets.find(s => s.properties?.title === portableTitle);

  const requests: any[] = [];

  // If both sheets are missing and we have a Sheet1 / ชีต1, rename the first sheet to generalTitle, and add portableTitle!
  if (!generalSheet && !portableSheet && sheets.length > 0) {
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: sheets[0].properties.sheetId,
          title: generalTitle
        },
        fields: 'title'
      }
    });
    requests.push({
      addSheet: {
        properties: {
          title: portableTitle
        }
      }
    });
  } else {
    if (!generalSheet) {
      requests.push({
        addSheet: {
          properties: {
            title: generalTitle
          }
        }
      });
    }
    if (!portableSheet) {
      requests.push({
        addSheet: {
          properties: {
            title: portableTitle
          }
        }
      });
    }
  }

  if (requests.length > 0) {
    try {
      const updateResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests })
      });
      if (updateResponse.ok) {
        // Refetch sheets
        const refetchResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        });
        if (refetchResponse.ok) {
          const newMeta = await refetchResponse.json();
          sheets = newMeta.sheets || [];
        }
      }
    } catch (batchErr) {
      console.warn('Failed to ensure separate sheets exist', batchErr);
    }
  }

  // Refresh refs
  generalSheet = sheets.find(s => s.properties?.title === generalTitle);
  portableSheet = sheets.find(s => s.properties?.title === portableTitle);

  const generalSheetName = generalSheet ? generalSheet.properties.title : (sheets[0]?.properties?.title || 'Sheet1');
  const generalSheetId = generalSheet ? generalSheet.properties.sheetId : (sheets[0]?.properties?.sheetId || 0);

  const portableSheetName = portableSheet ? portableSheet.properties.title : null;
  const portableSheetId = portableSheet ? portableSheet.properties.sheetId : null;

  const targets: {
    machine: 'general' | 'portable';
    name: string;
    id: any;
    items: typeof GENERAL_QC_ITEMS | typeof PORTABLE_QC_ITEMS;
    isPortable: boolean;
    titlePrefix: string;
    deviceModel: string;
  }[] = [
    {
      machine: 'general',
      name: generalSheetName,
      id: generalSheetId,
      items: GENERAL_QC_ITEMS,
      isPortable: false,
      titlePrefix: 'เครื่องทั่วไป Form F1',
      deviceModel: 'Digital X-Ray System (General DR-01)'
    }
  ];

  if (portableSheetName && portableSheetId !== null) {
    targets.push({
      machine: 'portable',
      name: portableSheetName,
      id: portableSheetId,
      items: PORTABLE_QC_ITEMS,
      isPortable: true,
      titlePrefix: 'เครื่องเคลื่อนที่ FM-RAD-003',
      deviceModel: 'X-Ray Mobile Unit (Portable DR-02)'
    });
  }

  for (const target of targets) {
    // Filter records matching the active machine type
    const filteredRecords = records.filter(r => (r.machine || 'general') === target.machine);

    // Align items chronologically (oldest first for records of the sheet)
    const sortedRecords = [...filteredRecords].sort((a, b) => a.date.localeCompare(b.date));

    const headers = [
      'วันที่ (Date)',
      'เวลา (Time)',
      'ผู้ตรวจสอบ (Inspector)',
      'ตำแหน่ง (Role)',
      ...target.items.map(item => `${item.id}. ${item.title}`),
      'ผลประเมินสุทธิ',
      'หมายเหตุเพิ่มเติม (Notes)'
    ];

    // Structure table data starting with header rows
    const sheetRows = [
      [`รายงานสรุปผลการตรวจสอบเครื่องเอกซเรย์วินิจฉัยประจำวัน (Daily Quality Control - ${target.titlePrefix})`],
      ['โรงพยาบาลแม่ทา • กลุ่มงานรังสีวิทยา'],
      [`รายงานประจำรอบเดือน: ${monthName} พ.ศ. ${yearBE} (ข้อมูล ณ วันที่: ${new Date().toLocaleDateString('th-TH')} เวลา ${new Date().toLocaleTimeString('th-TH')} น.)`],
      [`อุปกรณ์และติดตั้ง: ${target.deviceModel}`],
      [], // Empty spacing row
      headers
    ];

    sortedRecords.forEach(rec => {
      const row = [
        rec.date,
        rec.time,
        rec.inspector,
        rec.role === 'จพง' ? 'เจ้าพนักงาน' : rec.role === 'พนง' ? 'พนักงาน' : 'คนงาน',
      ];

      // Add each checklist item response
      target.items.forEach(item => {
        row.push(rec.results[item.id] || 'ไม่ได้ตรวจ');
      });

      row.push(
        rec.hasFailures ? '❌ ไม่ผ่านเกณฑ์' : '✅ ผ่านเกณฑ์',
        rec.notes || '-'
      );

      sheetRows.push(row);
    });

    // Calculate dynamic column letters
    const getColLetter = (colIndex: number) => {
      let letter = '';
      let temp = colIndex;
      while (temp > 0) {
        const remainder = (temp - 1) % 26;
        letter = String.fromCharCode(65 + remainder) + letter;
        temp = Math.floor((temp - remainder) / 26);
      }
      return letter;
    };

    const lastColLetter = getColLetter(headers.length);
    const range = `'${target.name}'!A1:${lastColLetter}${sheetRows.length + 2}`;
    const encodedRange = encodeURIComponent(range);

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range,
          majorDimension: 'ROWS',
          values: sheetRows,
        }),
      }
    );

    if (!response.ok) {
      const errorDetails = await response.text();
      console.error(`ส่งข้อมูล ${target.machine} ลงแผ่นงานไม่สำเร็จ:`, errorDetails);
    }

    // Apply visual formatting for this sheetId
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            // Bold Row 1 (Title)
            {
              repeatCell: {
                range: { sheetId: target.id, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: headers.length },
                cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 14 } } },
                fields: 'userEnteredFormat.textFormat'
              }
            },
            // Bold Row 6 (Headers) and set light blue background
            {
              repeatCell: {
                range: { sheetId: target.id, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 0, endColumnIndex: headers.length },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true },
                    backgroundColor: target.isPortable 
                      ? { red: 0.92, green: 0.90, blue: 0.98 } // purple tint for portable
                      : { red: 0.85, green: 0.92, blue: 0.98 }  // blue tint for general
                  }
                },
                fields: 'userEnteredFormat(textFormat,backgroundColor)'
              }
            }
          ]
        })
      });
    } catch (formatErr) {
      console.warn(`Formatting spreadsheet for ${target.machine} failed, skipping`, formatErr);
    }
  }
};

