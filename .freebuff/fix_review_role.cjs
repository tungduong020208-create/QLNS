const fs = require('fs');
let c = fs.readFileSync('src/components/screens/ReviewScreen.tsx', 'utf8');

// Remove the manager approve/reject section for pending items
c = c.replace(
  /                \{isManager && item\.status === 'pending' && \([\s\S]*?\}\)\n/,
  ''
);

// Remove the manager reviewed note section
c = c.replace(
  /                \{isManager && item\.status !== 'pending' && item\.managerNote && \([\s\S]*?\}\)\n/,
  ''
);

// Change {!isManager && ( to show reaction buttons for everyone
c = c.replace('{!isManager && (', '{(true && (');

// Change {!isManager && (goodCount > 0 for showing counts for everyone
c = c.replace('{!isManager && (goodCount > 0', '{(goodCount > 0');

// Remove unused state and functions
c = c.replace("  const [reviewingId, setReviewingId] = useState<string | null>(null);\n  const [reviewNote, setReviewNote] = useState('');\n  const [reviewPoints, setReviewPoints] = useState(10);\n", '');
c = c.replace("  const isManager = currentUser.role === 'manager';\n", '');

// Remove submitReview function
c = c.replace(
  /  const submitReview[\s\S]*?setReviewNote\(''\);\n  \};\n/,
  ''
);

fs.writeFileSync('src/components/screens/ReviewScreen.tsx', c);
console.log('Done!');
