const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'public', 'landing.html'),
  path.join(__dirname, 'public', 'dashboard.html'),
  path.join(__dirname, 'public', 'prodash.html')
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  
  let content = fs.readFileSync(file, 'utf8');
  let changes = 0;

  function replace(find, rep) {
    if (content.includes(find)) {
      const count = content.split(find).length - 1;
      content = content.split(find).join(rep);
      changes += count;
    }
  }

  // 1. ECOSYSTEM SECTION TITLE - "DectectionAI" typo
  replace('behind DectectionAI', 'behind Vikings');

  // 2. ECOSYSTEM ROW 01 - AI Models & Tools description
  replace(
    'Our solution includes cutting-edge AI tools built for space environments. From Falcon-integrated data pipelines to YOLOv8 training automation and performance dashboards, our tools are designed for rapid deployment, scalability, and real-world relevance in project brain simulations.',
    'Vikings includes cutting-edge AI tools built for modern development workflows. From GitHub repository import pipelines to RAG-powered knowledge engines and project dashboards, our tools are designed for rapid onboarding, deep code understanding, and real-world relevance across every project.'
  );

  // 3. ECOSYSTEM ROW 02 - Seamless Integration description
  replace(
    "Our system easily integrates with Falcon\u2019s synthetic data simulator and supports export-ready formats for YOLOv8. This allows teams to plug in new data, retrain models, and deploy updates efficiently across project brain scenarios with minimal overhead.",
    'Vikings seamlessly integrates with GitHub repositories and supports automatic code indexing and chunk generation. This allows developers to import new repos, build knowledge graphs, and deploy AI-assisted workflows efficiently across all projects with minimal overhead.'
  );

  // 4. ECOSYSTEM ROW 03 - Title
  replace('Optimized Training Infrastructure', 'Intelligent Memory Architecture');

  // 5. ECOSYSTEM ROW 03 - Description
  replace(
    'Our pipeline leverages GPU acceleration and training optimizations like mixed-precision, early stopping, and hyperparameter sweeps. This ensures fast, resource-efficient model development while maintaining high accuracy under varied environmental conditions',
    'Vikings leverages persistent memory through Hindsight, which captures conversation summaries, architecture decisions, bug patterns, and task outcomes. This ensures context-rich AI responses that improve over time, maintaining deep understanding across every development session'
  );

  // 6. ECOSYSTEM ROW 04 - Title
  replace('Real-Time Evaluation Tools', 'Visual Code Intelligence');

  // 7. ECOSYSTEM ROW 04 - Description
  replace(
    'We provide intuitive dashboards to monitor metrics like training loss, mAP scores, precision/recall, and confusion matrices in real time. These tools help identify weak points and guide model improvements efficiently during the training cycle.',
    'We provide intuitive visual project graphs that map module dependencies, file relationships, and function call patterns across your codebase. These tools help identify architectural patterns and guide development decisions efficiently during the coding cycle.'
  );

  // 8. SOLUTIONS 03 - Feature list items (old metrics)
  replace('>Real-Time Training Loss<', '>Repository Overview<');
  replace('>mAP @0.5 Tracking<', '>Module & File Counts<');
  replace('>Precision/Recall Curves<', '>Memory Statistics<');
  replace('>Confusion Matrices<', '>Last Task Summary<');
  replace('>Failure-Case Analysis<', '>Chunk Count Tracking<');
  replace('>Class-Wise Metrics<', '>Multi-Project Support<');

  // 9. SOLUTIONS 04 - "Falcon Sync Agent" → "Long-Term Memory"
  replace('>Falcon Sync<br />Agent<', '>Long-Term<br />Memory<');
  replace(
    "Keeps your model up-to-date by pulling fresh synthetic frames when new station layouts or lighting scenarios are pushed to Falcon. Automatically retriggers training jobs so your detector adapts to evolving environments.",
    'Keeps your AI assistant up-to-date by capturing conversation summaries, architecture decisions, and bug patterns after every session. Automatically builds a Hindsight memory layer so your AI adapts to your evolving codebase.'
  );
  replace('>Automatic Synthetic Data Pull<', '>Conversation Summaries<');
  replace('>Real-Time Scenario Sync<', '>Architecture Decisions<');
  replace('>Auto Retraining Triggers<', '>Bug Pattern Tracking<');
  replace('>Incremental Model Updates<', '>Task Outcome Logging<');
  replace('>Version Control<', '>Session Memory<');
  replace('>Falcon Integration<', '>Hindsight Integration<');

  // 10. SOLUTIONS 05 - "SpaceStation AI Assistant" → "AI Chat Assistant"
  replace(
    '>SpaceStation\n                                    <br />AI Assistant\n                                ',
    '>Vikings AI<br />Chat Assistant'
  );
  replace(
    'List all Toolbox detections with confidence below 0.5," "Show precision/recall trends for Oxygen Tank over the past three runs," or "Highlight misclassified Fire Extinguishers in low-occlusion scenes." Powered by an LLM connected to real-time training logs and evaluation metrics, it transforms raw performance data into actionable insights.',
    'Show me the architecture of the payment module," "What decisions were made about the auth system last sprint?" or "Generate a refactoring plan for the cart service." Powered by an LLM connected to your project\'s RAG knowledge and Hindsight memories, it transforms raw codebase data into actionable development insights.'
  );
  replace(
    'List all Toolbox detections with confidence below 0.5,” “Show precision/recall trends for Oxygen Tank over the past three runs,” or “Highlight misclassified Fire Extinguishers in low-occlusion scenes.” Powered by an LLM connected to real-time training logs and evaluation metrics, it transforms raw performance data into actionable insights.',
    '"Show me the architecture of the payment module," "What decisions were made about the auth system last sprint?" or "Generate a refactoring plan for the cart service." Powered by an LLM connected to your project\'s RAG knowledge and Hindsight memories, it transforms raw codebase data into actionable development insights.'
  );

  replace('>Conversational Query<', '>Natural Language Queries<');
  replace('>Real-Time Metrics Access<', '>RAG-Powered Code Access<');
  replace('>Trend Analysis<', '>Memory-Aware Context<');
  replace('>Failure-Case Highlighting<', '>Architecture Insights<');
  replace('>LLM-Driven Insights<', '>Hindsight-Driven Insights<');
  replace('>Contextual Recommendations<', '>Contextual Code Guidance<');

  // 11. SOLUTIONS 01 - fix the description that had Falcon's with curly apostrophe
  replace(
    "Seamlessly ingest and preprocess synthetic images from Falcon\u2019s digital-twin project brain simulator. Automates train/val/test splits, applies targeted augmentations (lighting, occlusion), and exports YOLOv8-compatible annotations.",
    'Seamlessly import and index any public GitHub repository. Vikings automatically filters important files, chunks the codebase, and creates a RAG-powered knowledge layer containing files, functions, APIs, schemas, and documentation.'
  );

  // 12. Clean up any remaining "Falcon" references (not in comments)
  replace("Falcon\u2019s", "GitHub\u2019s");
  replace('from Falcon', 'from GitHub');

  // 13. Clean up "space environments" / "space-based"
  replace('space environments', 'development workflows');
  replace('space-based', 'codebase');

  // 14. "object detection" cleanup
  replace('object detection', 'code intelligence');

  // 15. Clean up any remaining "YOLOv8" in visible (non-commented) sections
  replace('YOLOv8', 'RAG');

  // 16. "mAP" references
  replace('mAP', 'accuracy');

  fs.writeFileSync(file, content, 'utf8');
  console.log(`Processed ${path.basename(file)}: ${changes} replacements made`);
}
