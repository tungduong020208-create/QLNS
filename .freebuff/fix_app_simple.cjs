const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// Simplify ReviewScreen props
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
            evidences={evidences}
            onReactEvidence={handleReactEvidence}
          />`
);

fs.writeFileSync('src/App.tsx', c);
console.log('Done!');
