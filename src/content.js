// Every word on the site lives here. Edit this file, not the markup.

export const profile = {
  name: 'Alpesh Shinde',
  kana: 'アルペシュ・シンデ',
  role: 'Software & AI Engineer',
  location: 'San Jose, California',
  tagline: 'I build AI systems, data platforms, and the software around them, and I make them hold up in the real world.',
  email: 'hello@alpesh.me',
  github: 'https://github.com/alpeshrocks',
  linkedin: 'https://www.linkedin.com/in/alpeshshinde',
  resumePdf: 'resume.pdf',
};

// Web3Forms access key for the contact form. Leave empty to fall back to a mailto link.
export const WEB3FORMS_KEY = '';

export const about = [
  "Right now I'm at Lattice Semiconductor, building multi-agent AI systems that take a chip design from idea to finished hardware. Before that I spent a few years in Bengaluru as a machine learning and data engineer, first at BlueOptima, then at Servify.",
  "I'm finishing my MS in Computer Science at USC, and I lead a student engineering team at USC's IT services on the side.",
  "What I care about is AI that is boring in the best way: typed contracts, approval gates, runs you can replay. Let the model do the thinking it is good at, and let plain code do the rest.",
];

export const worlds = [
  { id: 'kyoto', kanji: '京', place: 'Kyoto', title: 'Prologue' },
  { id: 'climb', kanji: '登', place: 'Yosemite', title: 'The Climb' },
  { id: 'work', kanji: '峰', place: 'Zhangjiajie', title: 'The Work' },
  { id: 'foundations', kanji: '橋', place: 'Golden Gate', title: 'Foundations' },
  { id: 'way', kanji: '道', place: 'Sunset', title: 'The Way Forward' },
];

export const experience = [
  {
    company: 'Lattice Semiconductor',
    title: 'Agentic AI Systems Intern',
    dates: 'Jun 2026 to present',
    place: 'San Jose, CA',
    points: [
      'Building a supervised multi-agent system that carries a chip design from source code all the way to a finished bitstream and timing signoff.',
      'Designed it so the AI models interpret and rank, while plain deterministic code makes every control decision.',
      'Engineers approve each phase before anything irreversible happens, and every run can be replayed or rolled back.',
      'It answers questions from internal hardware knowledge with citations instead of guesses.',
    ],
  },
  {
    company: 'USC Information Technology Services',
    title: 'Student Engineer, Team Lead',
    dates: 'Apr 2025 to present',
    place: 'Los Angeles, CA',
    points: [
      'Lead a team of student engineers who keep campus technology running.',
      'Build internal tools and automation for campus IT, from monitoring dashboards to data pipelines.',
    ],
  },
  {
    company: 'Servify',
    title: 'Machine Learning & Data Engineer II',
    dates: 'Jul 2023 to Oct 2024',
    place: 'Bengaluru, India',
    points: [
      'Worked on an after-sales device-care platform used in markets around the world.',
      'Built the data pipelines behind its operational reporting, and made latency-sensitive services faster and sturdier.',
      'Trained forecasting models for each market and adapted language models to service records.',
    ],
  },
  {
    company: 'BlueOptima',
    title: 'Machine Learning & Data Engineer',
    dates: 'Apr 2022 to Jul 2023',
    place: 'Bengaluru, India',
    points: [
      'Built developer-productivity analytics over very large volumes of version-control history.',
      'Sped up a production inference path and automated impact studies the team used to run by hand.',
      'Moved large datasets between database platforms without losing a row.',
    ],
  },
];

// Projects, grouped so a reader can jump to the kind of work they care about.
// link is optional; only public repositories get one.
export const projectCategories = [
  {
    id: 'agents',
    name: 'Agents & language models',
    blurb: 'AI that reads, reasons, and acts, with the guardrails that make it trustworthy.',
    projects: [
      { name: 'CodeAtlas', body: 'Ask a codebase questions in plain language and get answers grounded in the actual source.', link: 'https://github.com/alpeshrocks/code-atlas-rag' },
      { name: 'Agent governance gateway', body: 'A control layer for AI coding agents: see what they do and what they spend, and stop risky actions before they run.' },
      { name: 'Terminal coding agent', body: 'A coding agent that plans, edits across many files, reviews its own work, and remembers past sessions.' },
      { name: 'Grounded answers engine', body: 'Retrieval over large documentation sets, with an evaluation suite that measures how often answers stay faithful to the source.' },
      { name: 'Model benchmarking framework', body: 'Side-by-side comparison of leading language models on reasoning and extraction, with test sets anyone can reproduce.' },
      { name: 'Error triage assistant', body: 'Turns a stack trace into a likely root cause and a suggested fix, right where engineers already work.' },
    ],
  },
  {
    id: 'systems',
    name: 'Distributed systems',
    blurb: 'Software that keeps its promises when machines fail and traffic spikes.',
    projects: [
      { name: 'Fault-tolerant key-value store', body: 'A replicated database that stays consistent when machines crash or the network splits in two.' },
      { name: 'Storage engine from scratch', body: 'A storage engine built from the ground up for heavy concurrent load, tested against crashes and sudden traffic spikes.' },
      { name: 'Query engine from scratch', body: 'A database query engine written from first principles and benchmarked against a production database.' },
      { name: 'Zero-trust services', body: 'A set of services that verify every request and every role, with no implicit trust between them.' },
      { name: 'Observability platform', body: 'Metrics, dashboards, and alerting that help a team see trouble across many services before users do.' },
      { name: 'Offline edge deployment', body: 'Software packaged to run on small hardware with no internet connection at all.' },
    ],
  },
  {
    id: 'ml',
    name: 'Machine learning',
    blurb: 'Models trained, shrunk, and served where they are actually needed.',
    projects: [
      { name: 'Distributed model training', body: 'Training large sequence models across many machines, built from scratch to learn exactly where scaling breaks.' },
      { name: 'High-speed inference engine', body: 'A model-serving core that manages memory and parallel work across GPUs so predictions come back fast.' },
      { name: 'Anomaly detection on tiny devices', body: 'A model small enough to spot anomalies in real time on low-power embedded hardware.' },
      { name: 'Sound recognition', body: 'Recognizes events in raw audio, with synthetic data to balance out the rare sounds.' },
      { name: 'Visual defect inspection', body: 'Finds manufacturing defects from product images, from data preparation through evaluation.' },
      { name: 'Patient risk scoring', body: 'Flags hospital patients at risk of returning to intensive care, with a dashboard clinicians can read at a glance.' },
    ],
  },
  {
    id: 'data',
    name: 'Data engineering',
    blurb: 'Pipelines that turn messy, fast-moving data into something people can trust.',
    projects: [
      { name: 'Sensor data lakehouse', body: 'Ingests a large daily stream of sensor records and validates every one before it reaches analytics.' },
      { name: 'Real-time fraud detection', body: 'Watches a live stream of transactions and flags unusual ones within seconds instead of minutes.' },
      { name: 'Modern analytics stack', body: 'Raw public data shaped into clean, tested, documented datasets that reports can rely on.' },
      { name: 'Recommendation engine', body: 'Matches people with relevant profiles across a very large history of interactions.' },
      { name: 'Programmatic labeling', body: 'Labels large text collections with rules instead of hand annotation, and shows the effect of each rule instantly.' },
    ],
  },
  {
    id: 'robotics',
    name: 'Robotics & simulation',
    blurb: 'Teaching machines to move, first in simulation, then in the real world.',
    projects: [
      { name: 'Dexterous robot hand', body: 'Teaches a multi-fingered robot hand new skills from recorded human motion, and carries them from simulation to hardware.' },
      { name: 'Simulation-to-reality control', body: 'A control policy trained entirely in simulation that survives the jump to a physical robot.' },
      { name: 'Language-driven task planner', body: 'Turns a plain-language instruction into a sequence of robot motions that are physically possible.' },
      { name: 'Robot fleet simulator', body: 'Simulated robot fleets with tooling to measure throughput, queueing, and energy use.' },
    ],
  },
  {
    id: 'products',
    name: 'Products & apps',
    blurb: 'Full products, from the screen people touch to the service behind it.',
    projects: [
      { name: 'Mobile analytics app', body: 'A cross-platform mobile analytics app, built with close attention to polish and detail.' },
      { name: 'Multiplayer matchmaking', body: 'Pairs players by skill and connection quality and shows the queue updating live.' },
      { name: 'Energy management dashboard', body: 'A live view of power consumption and grid health for an energy system.' },
      { name: 'Feature rollout manager', body: 'Lets product teams release features gradually, to the right people, and roll back in a click.' },
      { name: 'Video analysis platform', body: 'Runs vision models over large video queues and plays the annotated results back in the browser.' },
    ],
  },
  {
    id: 'security',
    name: 'Security & trust',
    blurb: 'Systems built so that tampering shows and access is earned.',
    projects: [
      { name: 'Secure decentralized audit', body: 'Tamper-evident audit trails for health records, kept by independent nodes that notice when history is rewritten.' },
      { name: 'Real estate registry', body: 'Property deeds, shared ownership, escrow, and rent handled on a public ledger.', link: 'https://github.com/alpeshrocks/Blockchain-real-estate-registry' },
      { name: 'Network threat detection', body: 'Inspects network traffic as it flows and flags malicious patterns in real time.' },
      { name: 'Trust and safety detection', body: 'Spots fraudulent behavior patterns across a user community as they happen.' },
    ],
  },
  {
    id: 'hardware',
    name: 'Hardware & algorithms',
    blurb: 'Close to the metal, and deep in the math.',
    projects: [
      { name: 'CircuitSense', body: 'Reads a circuit design, measures its power, speed, and size, checks timing, lays out a floorplan, and asks an AI agent where it wastes effort.', link: 'https://github.com/alpeshrocks/CircuitSense' },
      { name: 'GPU networking simulator', body: 'Models how GPUs talk to each other at scale, to cut the cost of moving data between machines.' },
      { name: 'Lab instrument console', body: 'A desktop app that drives lab instruments and plots their signals live.' },
      { name: 'AeroTSP-3D', body: 'The travelling salesman problem in three dimensions, with an interactive 3D viewer of the routes.', link: 'https://github.com/alpeshrocks/AeroTSP-3D' },
      { name: 'AlphaGo-Lite', body: 'A Go engine with a search-based player and a tournament runner that ranks agents against each other.', link: 'https://github.com/alpeshrocks/Alpha_GO_Lite' },
      { name: 'Combinatorial optimizer', body: 'A solver for hard scheduling and routing problems, tuned until both time and memory were tight.' },
    ],
  },
];

export const education = [
  {
    school: 'University of Southern California',
    degree: 'MS Computer Science, Data Science specialization',
    dates: 'Jan 2025 to Dec 2026',
    gpa: '3.90 / 4.0',
  },
  {
    school: 'Visvesvaraya Technological University',
    degree: 'BE Computer Science',
    dates: 'Aug 2018 to Apr 2022',
    gpa: '3.75 / 4.0',
  },
];

export const extras = [
  {
    title: 'Hackathons',
    body: 'Won national hackathons in India, including the Smart India Hackathon, the Flipkart hackathon, and a Government of India hackathon.',
  },
  {
    title: 'A delivery business',
    body: 'Started a quick-commerce delivery service from nothing. Real orders, real customers, and a crash course in operations no class could teach.',
  },
  {
    title: 'Off the keyboard',
    body: 'I travel whenever I can and hike whenever I can\'t. Most of the places on this page are ones I have walked or still mean to.',
  },
];

// Short lines that float through the transitions between worlds.
export const interludes = [
  'Every climb begins in a quiet garden.',
  'From the top, you see what is worth building.',
  'Every great bridge is mostly what holds it up.',
  'Every road ends somewhere. This one ends at a beginning.',
];

export const quests = [
  { id: 'koi', world: 0, name: 'Koi', hint: 'The koi are hungry. Offer them something, three times.' },
  { id: 'climber', world: 1, name: 'Climber', hint: 'Someone is climbing the great wall. Look for their light.' },
  { id: 'rider', world: 2, name: 'Rider', hint: 'Not everything in the mist is a mountain. Catch the one that flies.' },
  { id: 'sail', world: 3, name: 'Sail', hint: 'A small boat is crossing under the bridge. Wave it through.' },
  { id: 'blade', world: 4, name: 'Blade', hint: 'Hold still on the figure at sunset. Draw only when ready.' },
];

export const secret = {
  title: 'The moon garden',
  haiku: ['raked stones hold the moon', 'five stamps, one patient walker', 'thank you for staying'],
  note: "You found every stamp. That kind of curiosity is exactly what I look for in teammates, so if you made it this far, say hello. Mention the moon garden and I'll know.",
};
