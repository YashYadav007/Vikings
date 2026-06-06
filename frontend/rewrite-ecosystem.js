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

  // Replace Row 01
  let oldRow1Title1 = '<h3 class="ecosystem-row-title">AI Models &amp; Tools</h3>';
  let oldRow1Title2 = '<h3 class="ecosystem-row-title">AI Models & Tools</h3>';
  let newRow1Title = '<h3 class="ecosystem-row-title">Persistent Project Brain</h3>';
  
  let oldRow1Desc1 = '<div>Vikings includes cutting-edge AI tools built for modern development workflows. From GitHub repository import pipelines to RAG-powered knowledge engines and project dashboards, our tools are designed for rapid onboarding, deep code understanding, and real-world relevance across every project.</div>';
  let oldRow1Desc2 = '<div>Our solution includes cutting-edge AI tools built for space environments. From Falcon-integrated data pipelines to YOLOv8 training automation and performance dashboards, our tools are designed for rapid deployment, scalability, and real-world relevance in project brain simulations.</div>';
  let newRow1Desc = '<div>Vikings is a memory-powered AI coding workspace that gives every GitHub repository its own persistent Project Brain. The core problem Vikings solves is that today\'s AI coding tools are chat-centric and stateless, meaning developers have to repeatedly explain the same codebase, architecture, bugs, decisions, and context in every new conversation.</div>';

  content = content.replace(oldRow1Title1, newRow1Title).replace(oldRow1Title2, newRow1Title);
  content = content.replace(oldRow1Desc1, newRow1Desc).replace(oldRow1Desc2, newRow1Desc);

  // Replace Row 02
  let oldRow2Title = '<h3 class="ecosystem-row-title">Seamless Integration</h3>';
  let newRow2Title = '<h3 class="ecosystem-row-title">Living Knowledge System</h3>';
  
  let oldRow2Desc1 = '<div>Vikings seamlessly integrates with GitHub repositories and supports automatic code indexing and chunk generation. This allows developers to import new repos, build knowledge graphs, and deploy AI-assisted workflows efficiently across all projects with minimal overhead.</div>';
  let oldRow2Desc2 = '<div>Our system easily integrates with Falcon’s synthetic data simulator and supports export-ready formats for YOLOv8. This allows teams to plug in new data, retrain models, and deploy updates efficiently across project brain scenarios with minimal overhead.</div>';
  let oldRow2Desc3 = "<div>Our system easily integrates with Falcon\u2019s synthetic data simulator and supports export-ready formats for YOLOv8. This allows teams to plug in new data, retrain models, and deploy updates efficiently across project brain scenarios with minimal overhead.</div>";
  let newRow2Desc = '<div>Vikings changes this by allowing a developer to import a GitHub repository once and automatically build a living knowledge system around it. The platform analyzes the repository, filters important files, chunks the codebase, and creates a RAG-powered knowledge layer containing files, functions, APIs, schemas, routes, components, configurations, and documentation.</div>';

  content = content.replace(oldRow2Title, newRow2Title);
  content = content.replace(oldRow2Desc1, newRow2Desc).replace(oldRow2Desc2, newRow2Desc).replace(oldRow2Desc3, newRow2Desc);

  // Replace Row 03
  let oldRow3Title1 = '<h3 class="ecosystem-row-title">Intelligent Memory Architecture</h3>';
  let oldRow3Title2 = '<h3 class="ecosystem-row-title">Optimized Training Infrastructure</h3>';
  let newRow3Title = '<h3 class="ecosystem-row-title">Hindsight Memory Layer</h3>';
  
  let oldRow3Desc1 = '<div>Vikings leverages persistent memory through Hindsight, which captures conversation summaries, architecture decisions, bug patterns, and task outcomes. This ensures context-rich AI responses that improve over time, maintaining deep understanding across every development session</div>';
  let oldRow3Desc2 = '<div>Our pipeline leverages GPU acceleration and training optimizations like mixed-precision, early stopping, and hyperparameter sweeps. This ensures fast, resource-efficient model development while maintaining high accuracy under varied environmental conditions</div>';
  let newRow3Desc = '<div>Vikings maintains a long-term memory layer powered by Hindsight that stores project decisions, bugs, fixes, risks, architecture discussions, preferences, lessons learned, and task outcomes. Together, these create a complete understanding of both the codebase itself and the history behind it. Every project is visualized as a dynamic graph.</div>';

  content = content.replace(oldRow3Title1, newRow3Title).replace(oldRow3Title2, newRow3Title);
  content = content.replace(oldRow3Desc1, newRow3Desc).replace(oldRow3Desc2, newRow3Desc);

  // Replace Row 04
  let oldRow4Title1 = '<h3 class="ecosystem-row-title">Visual Code Intelligence</h3>';
  let oldRow4Title2 = '<h3 class="ecosystem-row-title">Real-Time Evaluation Tools</h3>';
  let newRow4Title = '<h3 class="ecosystem-row-title">Autonomous Agent Workflow</h3>';
  
  let oldRow4Desc1 = '<div>We provide intuitive visual project graphs that map module dependencies, file relationships, and function call patterns across your codebase. These tools help identify architectural patterns and guide development decisions efficiently during the coding cycle.</div>';
  let oldRow4Desc2 = '<div>We provide intuitive dashboards to monitor metrics like training loss, mAP scores, precision/recall, and confusion matrices in real time. These tools help identify weak points and guide model improvements efficiently during the training cycle.</div>';
  let newRow4Desc = '<div>Beyond answering questions, Vikings includes an autonomous agent workflow where a developer can assign a task, the agent retrieves relevant code and memories, generates an execution plan, identifies risks, suggests tests, and creates a patch preview. No code is modified immediately; instead, Vikings follows a safe workflow.</div>';

  content = content.replace(oldRow4Title1, newRow4Title).replace(oldRow4Title2, newRow4Title);
  content = content.replace(oldRow4Desc1, newRow4Desc).replace(oldRow4Desc2, newRow4Desc);

  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated ${path.basename(file)}`);
}
