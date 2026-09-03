const fs = require('fs');

// Fix 1: initialData.ts - emails + departments
let d = fs.readFileSync('src/data/initialData.ts', 'utf8');
d = d.replace(/enterprisehr\.vn/g, 'coffeehouse.vn');
d = d.replace(/Phòng Kinh Doanh/g, 'Khu vực kinh doanh');
d = d.replace(/Phòng Kỹ Thuật/g, 'Khu vực kỹ thuật');
fs.writeFileSync('src/data/initialData.ts', d);

// Fix 2: LoginScreen.tsx - placeholder
let l = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');
l = l.replace('an.nguyen@enterprisehr.vn', 'an.nguyen@coffeehouse.vn');
fs.writeFileSync('src/components/screens/LoginScreen.tsx', l);

// Fix 3: ProfileScreen.tsx - Enterprise HR text
let p = fs.readFileSync('src/components/screens/ProfileScreen.tsx', 'utf8');
p = p.replace('Enterprise HR', 'Coffee House HR');
fs.writeFileSync('src/components/screens/ProfileScreen.tsx', p);

console.log('All text fixed!');
