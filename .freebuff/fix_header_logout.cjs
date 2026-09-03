const fs = require('fs');
let c = fs.readFileSync('src/components/Header.tsx', 'utf8');

// Add showLogoutConfirm state
c = c.replace(
  "const [showNotifs, setShowNotifs] = useState(false);",
  "const [showNotifs, setShowNotifs] = useState(false);\n  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);"
);

// Change logout button onClick
c = c.replace(
  /onClick=\{onLogout\}\s*\n\s*aria-label="Đăng xuất"/,
  'onClick={() => setShowLogoutConfirm(true)}\n          aria-label="Đăng xuất"'
);

// Add confirmation modal before closing </header>
c = c.replace(
  '    </header>\n  );\n};',
  `        {/* Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-sm mx-4 overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[32px] text-[#ba1a1a]">logout</span>
                </div>
                <h3 className="font-headline text-lg font-bold text-[#1b1b21] mb-1">Đăng xuất tài khoản?</h3>
                <p className="text-[13px] text-[#49454f] mb-1">
                  Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?
                </p>
                <p className="text-[11px] text-[#767683]">
                  Tất cả dữ liệu chưa lưu sẽ bị mất.
                </p>
              </div>
              <div className="flex border-t border-[#cac4d0]">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 text-sm font-medium text-[#49454f] hover:bg-gray-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={() => { setShowLogoutConfirm(false); onLogout(); }}
                  className="flex-1 py-3 text-sm font-medium text-[#ba1a1a] hover:bg-red-50 transition-colors border-l border-[#cac4d0]"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};`
);

fs.writeFileSync('src/components/Header.tsx', c);
console.log('Done!');
