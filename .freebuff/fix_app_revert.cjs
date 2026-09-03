const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// Revert ReviewScreen props back to original
c = c.replace(
  `<ReviewScreen
            currentUser={currentUser}
            handovers={handovers}
            onToggleTask={handleToggleTask}
            onConfirmHandover={handleConfirmHandover}
          />`,
  `<ReviewScreen
            currentUser={currentUser}
            evidences={evidences}
            onReactEvidence={handleReactEvidence}
            onReviewEvidence={handleReviewEvidence}
            onSelectEvidence={(evidence) => setSelectedEvidence(evidence)}
          />`
);

fs.writeFileSync('src/App.tsx', c);
console.log('Reverted!');
