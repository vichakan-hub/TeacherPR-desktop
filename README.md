# TeacherPR Desktop PWA

ไฟล์ในชุดนี้
- `index.html` โค้ดเดิมที่เพิ่ม PWA meta tags และลงทะเบียน Service Worker แล้ว
- `manifest.webmanifest`
- `service-worker.js`
- `icons/` ไอคอนสำหรับ Desktop, Android, iOS และ maskable icon

วิธีติดตั้ง
1. อัปโหลดไฟล์ทั้งหมดไปไว้ระดับเดียวกับ `index.html`
2. ต้องเปิดผ่าน HTTPS เช่น GitHub Pages หรือ Cloudflare Pages
3. หลังอัปโหลด ให้เปิด DevTools > Application > Service Workers แล้วกด Unregister ของเวอร์ชันเก่าหนึ่งครั้ง
4. Reload แบบ Hard Reload
5. Chrome/Edge จะแสดงเมนู Install app

หมายเหตุ
- ใช้พาธแบบ `./` จึงรองรับเว็บที่อยู่ในโฟลเดอร์ย่อย
- Service Worker ไม่ cache คำขอแบบ Range/สถานะ 206 เพื่อป้องกัน error `Partial response is unsupported`
- Supabase และ CDN ยังต้องใช้อินเทอร์เน็ต จึงเป็น PWA แบบติดตั้งได้ แต่ไม่ได้ทำงานออฟไลน์ครบทุกฟังก์ชัน
