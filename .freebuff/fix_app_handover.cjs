const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Fix import types to include ShiftHandover
c = c.replace(
  "import { User, EvidenceItem, NotificationItem, ActiveTab, CheckInRecord, CustomerRating } from './types';",
  "import { User, EvidenceItem, NotificationItem, ActiveTab, CheckInRecord, CustomerRating, ShiftHandover } from './types';"
);

// 2. Fix import data to include INITIAL_HANDOVERS
c = c.replace(
  "import { INITIAL_USERS, INITIAL_EVIDENCES, INITIAL_NOTIFICATIONS, INITIAL_CUSTOMER_RATINGS } from './data/initialData';",
  "import { INITIAL_USERS, INITIAL_EVIDENCES, INITIAL_NOTIFICATIONS, INITIAL_CUSTOMER_RATINGS, INITIAL_HANDOVERS } from './data/initialData';"
);

// 3. Add handovers state after customerRatings
c = c.replace(
  "  // Notifications state",
  "  // Shift Handovers state\n  const [handovers, setHandovers] = useState<ShiftHandover[]>(INITIAL_HANDOVERS);\n\n  // Notifications state"
);

// 4. Add handler functions - find the area with handleReactEvidence
const handlerMarker = "  const addToast =";
const handlerCode = `  // Toggle handover task
  const handleToggleTask = (handoverId: string, taskId: string) => {
    setHandovers(prev => prev.map(h => {
      if (h.id !== handoverId) return h;
      return {
        ...h,
        checklist: h.checklist.map(t =>
          t.id === taskId
            ? {
                ...t,
                completed: !t.completed,
                completedBy: !t.completed ? currentUser.name : undefined,
                completedAt: !t.completed ? new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : undefined,
              }
            : t
        )
      };
    }));
  };

  // Confirm handover
  const handleConfirmHandover = (handoverId: string, notes: string) => {
    setHandovers(prev => prev.map(h => {
      if (h.id !== handoverId) return h;
      return {
        ...h,
        status: 'completed' as const,
        notes: notes || h.notes,
        confirmedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
    }));
    addToast('success', 'Bàn giao ca thành công', 'Ca làm việc đã được xác nhận bàn giao');
  };

  `;
c = c.replace(handlerMarker, handlerCode + handlerMarker);

// 5. Update ReviewScreen props
c = c.replace(
  `<ReviewScreen
            currentUser={currentUser}
            evidences={evidences}
            onReactEvidence={handleReactEvidence}
            onReviewEvidence={handleReviewEvidence}
            onSelectEvidence={(evidence) => setSelectedEvidence(evidence)}
          />`,
  `<ReviewScreen
            currentUser={currentUser}
            handovers={handovers}
            onToggleTask={handleToggleTask}
            onConfirmHandover={handleConfirmHandover}
          />`
);

fs.writeFileSync('src/App.tsx', c);
console.log('App.tsx updated!');
