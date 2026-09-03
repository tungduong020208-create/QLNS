const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// Remove handover state
c = c.replace(
  "  // Shift Handovers state\n  const [handovers, setHandovers] = useState<ShiftHandover[]>(INITIAL_HANDOVERS);\n\n",
  ""
);

// Remove handleToggleTask and handleConfirmHandover
c = c.replace(
  /  \/\/ Toggle handover task\n  const handleToggleTask[\s\S]*?addToast\('success', 'Bàn giao ca thành công', 'Ca làm việc đã được xác nhận bàn giao'\);\n  \};\n\n  /,
  ''
);

// Remove unused imports
c = c.replace(
  ", ShiftHandover",
  ""
);
c = c.replace(
  ", INITIAL_HANDOVERS",
  ""
);

fs.writeFileSync('src/App.tsx', c);
console.log('Cleaned up!');
