const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'public', 'landing.html'),
  path.join(__dirname, 'public', 'dashboard.html'),
  path.join(__dirname, 'public', 'prodash.html')
];

const newHtml = `
                    <div data-w-id="74867ac9-a6a5-071d-2a63-2d85a7e2994a" style="opacity:0" class="ecosystem-row">
                        <div class="ecosystem-row-item">
                            <div class="ecosystem-row-nb">01</div>
                            <h3 class="ecosystem-row-title">Persistent Project Brain</h3>
                        </div>
                        <div class="ecosystem-row-item">
                            <div>Vikings is a memory-powered AI coding workspace that gives every GitHub repository its own persistent Project Brain. The core problem Vikings solves is that today's AI coding tools are chat-centric and stateless, meaning developers have to repeatedly explain the same codebase, architecture, bugs, decisions, and context in every new conversation.</div>
                        </div>
                    </div>
                    <div data-w-id="42f34889-8d02-1000-3c56-3a53b68b1d3e" style="opacity:0" class="ecosystem-row">
                        <div class="ecosystem-row-item">
                            <div class="ecosystem-row-nb">02</div>
                            <h3 class="ecosystem-row-title">Living Knowledge System</h3>
                        </div>
                        <div class="ecosystem-row-item">
                            <div>Vikings changes this by allowing a developer to import a GitHub repository once and automatically build a living knowledge system around it. The platform analyzes the repository, filters important files, chunks the codebase, and creates a RAG-powered knowledge layer containing files, functions, APIs, schemas, routes, components, configurations, and documentation.</div>
                        </div>
                    </div>
                    <div data-w-id="3e4f9776-ff53-61d0-805c-96cf5ab101a2" style="opacity:0"
                        class="ecosystem-row row-with-btn row-with-btn--lg">
                        <div class="ecosystem-row-item row-with-btn">
                            <div class="ecosystem-row-nb">03</div>
                            <h3 class="ecosystem-row-title">Hindsight Memory Layer</h3>
                            <div class="ecosystem-btn-wrap">
                                <a scramble-link="" rel="noopener noreferrer nofollow" href="/import" target="_blank"
                                    class="btn mb-minus w-inline-block">
                                    <div scramble-text="">Try Now</div>
                                </a>
                            </div>
                        </div>
                        <div class="ecosystem-row-item">
                            <div>Vikings maintains a long-term memory layer powered by Hindsight that stores project decisions, bugs, fixes, risks, architecture discussions, preferences, lessons learned, and task outcomes. Together, these create a complete understanding of both the codebase itself and the history behind it. Every project is visualized as a dynamic graph.</div>
                        </div>
                    </div>
                    <div data-w-id="0c0d0a29-58e2-6b4a-2394-0ba4b255368f" style="opacity:0"
                        class="ecosystem-row row-with-btn">
                        <div class="ecosystem-row-item">
                            <div class="ecosystem-row-nb">04</div>
                            <h3 class="ecosystem-row-title">Autonomous Agent Workflow</h3>
                            <div class="ecosystem-btn-wrap">
                                <a scramble-link="" rel="noopener noreferrer nofollow" href="/import" target="_blank"
                                    class="btn w-inline-block">
                                    <div scramble-text="">Try Now</div>
                                </a>
                            </div>
                        </div>
                        <div class="ecosystem-row-item">
                            <div>Beyond answering questions, Vikings includes an autonomous agent workflow where a developer can assign a task, the agent retrieves relevant code and memories, generates an execution plan, identifies risks, suggests tests, and creates a patch preview. No code is modified immediately; instead, Vikings follows a safe workflow.</div>
                        </div>
                    </div>`;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  
  let content = fs.readFileSync(file, 'utf8');

  // We will replace everything from `<div data-w-id="74867ac9-a6a5-071d-2a63-2d85a7e2994a"` 
  // down to the end of the 04 ecosystem row.
  const startRegex = /<div data-w-id="74867ac9-a6a5-071d-2a63-2d85a7e2994a"[\s\S]*?<!-- End of ecosystem rows, or just look for the end of 04 -->/g;
  
  // Actually, string manipulation with regex is safer if we know exact boundaries
  const startStr = '<div data-w-id="74867ac9-a6a5-071d-2a63-2d85a7e2994a"';
  let startIdx = content.indexOf(startStr);
  
  if (startIdx !== -1) {
    // Find the end of row 04. It's the closing </div> of the 4th row.
    // Row 04 id: 0c0d0a29-58e2-6b4a-2394-0ba4b255368f
    const row04Str = '<div data-w-id="0c0d0a29-58e2-6b4a-2394-0ba4b255368f"';
    const row04Idx = content.indexOf(row04Str, startIdx);
    
    if (row04Idx !== -1) {
      // Find the closing </div></div> of row 04.
      // There are multiple divs inside.
      // A safe way is to find the next section boundary or use known text.
      // In the previous check, I saw the next section is `<!-- <div id="ai-model" ...` or `<div id="ai-model"`
      
      // We know there's a `<div class="ai-model-section` shortly after or similar.
      // But we can just replace via string literal because we know exactly what is there.
    }
  }

  // Alternative strategy: just replace the specific row-titles and div contents based on what they are currently.
  // We know the current titles are "AI Models &amp; Tools" or "AI Models & Tools" or "Persistent Project Brain".
  // Because the previous script ran, the content inside is the "Vikings includes cutting-edge..." 
  // Wait, the user might be using the cached one, but ON DISK it is the updated one!
  
  // Let's just use regex to replace the content of the 4 items.

  // Item 01
  content = content.replace(
    /<h3 class="ecosystem-row-title">[^<]+<\/h3>\s*<\/div>\s*<div class="ecosystem-row-item">\s*<div>[^<]+<\/div>/g,
    (match, offset, str) => {
       return match; // We will do it more specifically
    }
  );
}
