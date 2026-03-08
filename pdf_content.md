--- Page 1 ---
Idea Submission: AI Unlocked 
Institute Name: IIT Roorkee        Team Name:  Neurixia 
Challenge Area: Agent Teamwork Registered Email ID of Team Leader: shivansh_y@ece.iitr.ac.in 
Project Title: CampusCoPilot 
 
Project Sub-title: Multi-Agent AI command centers for students:  From messy semester chaos to a coordinated AI 
team that plans, tracks, teaches and mentors every student. 
 
The Team  
 
We are a team of developers from IIT Roorkee, and we’re building this because we’ve lived the problem. Between 
packed academic schedules, back-to-back deadlines, and a lack of accessible mentorship, college can easily become 
overwhelming. This past semester was a wake-up call—with so many overlapping assignments, it felt like students 
were just trying to survive the week instead of actually learning and growing.  
We realized the current support systems aren't doing enough, so we decided to choose this track: a practical, multi-
agent AI system that can actually be deployed in colleges, rather than just another basic chatbot. 
Since our backgrounds span full-stack development, AI/ML, content creation, and electronics, we each bring a specific 
strength to the project: 
• Priyanshu Budania handles the creative strategy and user experience. He makes sure our complex AI features 
translate into an intuitive, easy-to-use platform for students. 
• Himanshu Raj focuses on AI and Machine Learning. He builds the smart, adaptive systems that handle 
personalized learning and academic planning. 
• Pratham Yadav works on the core Agentic AI. He ensures that our different AI agents communicate smoothly 
and operate logically behind the scenes. 
• Shivansh Yadav handles the backend and integration. I work with Python and FastAPI to connect real-world 
applications with both open-source and commercial LLMs, particularly focusing on RAG (Retrieval-Augmented 
Generation) setups. 
Our ultimate goal is to build a fully functional system that we can showcase through live demos and actually put  into 
the hands of real students. 
The Concept  
 
CampusCoPilot is a three-agent system that behaves like a personal operations team, learning coach, and placement 
mentor for each student. 
Instead of only scheduling tasks, it continuously senses what is happening in the student’s life (new notices, surprise 
quizzes, missed deadlines, mood changes), automatically replans the semester, and generates personalized 
micro-learning and career steps. 
• Dynamic Re-planning Engine – When a student falls sick, a class is canceled, or an exam is rescheduled, the 
Planner Agent automatically recomputes the entire plan and negotiates trade -offs (for example, shifting 
low-priority topics or weekend slots). 
--- Page 2 ---
• AI Study Squad Builder – The system clusters students with similar courses but different strengths, then 
forms “squads” and schedules shared sessions, peer-doubt clearing, and group revision, using agents to 
coordinate time slots and reminders. 
• Micro-Tutor Mode – For each planned study block, the Retriever Agent assembles 10-minute micro-lessons 
(videos, PDFs, question sets) and the Executor Agent generates interactive quizzes and flashcards right inside 
the app. 
• Career & Portfolio Tracker – Every project, solved problem set, and completed course is logged; the system 
auto-drafts resume bullet points, LinkedIn updates, and a skills graph so students see how each week moves 
them closer to internships and jobs. 
• Well-being & Focus Nudges (non-clinical) – Based on workload, missed tasks, and late-night usage patterns 
(highly common among Indian college students), the agents gently recommend breaks, focus sprints, or 
lighter days to reduce burnout, without giving any medical advice. 
The goal is to turn chaotic semesters into adaptive “campaigns” where an AI team continuously optimizes time, 
learning, and career outcomes. 
Target Audience or Market  
 
• Primary: Undergraduate and postgraduate students in Indian colleges (engineering, science, commerce, and 
management), especially in tier-2/tier-3 cities where structured guidance and counselling are limited. 
• Secondary: Universities, coaching institutes, and EdTech platforms that want an AI-powered companion to 
improve outcomes and reduce dropout or backlogs. 
The total addressable market is all higher-education students in India; the latest AISHE (All India Survey on Higher 
Education) report provides official enrolment numbers, which can be cited to estimate tens of millions of potential 
users and to segment by discipline and state. 
The initial beachhead is a few pilot colleges where the team can run real-world trials with engineering and 
management students preparing for placements. 
Personas  
 
Persona 1 – Abishek Yadav, 19, B.Tech Mechanical, Tier-2 college 
Abhishek juggles academics, labs, club work, YouTube tutorials, and internship prep, but everything is fragmented 
across apps and he often starts late for majors. He is good friend of Shivansh(teammate) and he used to tell that he 
could not manage and usually forget all his assignments as he is from UP board so he finds English tough.  
CampusCoPilot ingests his timetable, syllabi, and personal goals (CGPA target, specific companies), then generates a 
living roadmap: daily tasks, topic priorities, mock tests based on his college pyqs, and on weekend make him adjusting 
to academic when he falls behind. 
 
Persona 2 – Jahanvi , 21, LAW student, Tier-2 College 
She handles group projects, case competitions, presentations; she struggles with coordination and documentation 
rather than raw study content. Relative of Pratham (teammate) 
CampusCoPilot creates shared plans for her groups, tracks who is responsible for each slide or deliverable, schedules 
rehearsals, and auto-generates structured meeting notes and action items after each team discussion, all visible on her 
dashboard. 
 
 
 
--- Page 3 ---
 
How it works:  
 
**Since we would be provided with azure credits so it is better to work with azure only, so we thought of azure 
platform features. Below is few features which can be implemented, once we go through the project, Our team can 
have a survey about the students feedback regarding their semester and from their reviews we would include more 
features and implement in this app accordingly, for the time being our team had come up with these features. ** 
 
From the student’s view, CampusCoPilot is a web/mobile app where they upload syllabi, connect calendars 
(college + personal), set goals (grades, skills, target roles), and optionally answer a quick “study style and 
constraints” quiz. 
Under the hood, three cooperating AI agents orchestrate the experience, with some extra intelligence that makes 
the project stand out: 
• Planner Agent – Strategy Brain 
• Parses PDFs (syllabus, exam calendar), LMS exports, and notices using Azure Document 
Intelligence. 
• Builds a semester campaign: daily/weekly tasks, difficulty-weighted distribution, buffer days, and 
catch-up blocks; uses reinforcement from actual completion data to learn the student’s “true 
capacity” over time. 
• Handles disruptions by subscribing to events (holiday notices, new assignment uploads) and 
recalculating the roadmap. 
• Retriever Agent – Knowledge & Context Scout 
• Uses Azure AI Search to index institutional content (notes, previous papers, lecture slides) plus 
high-quality public sources curated by faculty and the team. 
• For each upcoming task, retrieves a minimal learning path: 1–2 videos, 1 summary note, and 5–10 
practice questions, ranked based on past performance and user feedback.  
• Supports multi-modal inputs: if a student snaps a photo of the whiteboard or handwritten notes, 
OCR + LLMs extract topics and link them to future revision tasks. 
• Executor Agent – Action & Engagement Driver 
• Integrates with Microsoft 365 (Outlook Calendar, To Do, Teams) via Microsoft Graph, and Azure 
Communication Services for WhatsApp/SMS-like nudges. 
• Converts plan items into scheduled focus sessions, Pomodoro timers, checklists, and group 
events; tracks completion and updates progress and “skill mastery meters” in real time.  
• Powers “Study Sprints” and squad challenges: it schedules synchronized study blocks, tracks 
adherence, and awards streaks and badges to keep students engaged. 
Link of the Architecture Diagram 
 
 
 
--- Page 4 ---
Core Technologies  
 
Apart from those fronted and backend web stack we need these technologies: 
• Azure OpenAI (reasoning, planning, micro-tutoring, summarization, and multi-agent coordination prompts). 
• Azure Document Intelligence for syllabus, timetable, and notice extraction.  
• Azure AI Search for RAG over institutional and curated content. 
• Azure Container Apps / AKS + Azure Service Bus for scalable multi-agent orchestration. 
• Azure Cosmos DB, Blob Storage, and optional Azure Cache for Redis for fast access. 
• Microsoft Graph and Azure Communication Services for calendars, emails, Teams integration, and 
mobile/WhatsApp-style reminders. 
• Power BI and Azure Monitor for analytics, cohort dashboards, and reliability monitoring. 
This stack demonstrates both advanced distributed-agent design and deep integration into the Microsoft ecosystem, 
matching the spirit of the Agent Teamwork track. 
 
The Business Plan**:  
 
Phase 1 – Pilot & Validation 
• Partner with 1–2 engineering colleges from tier 3 college and then tier 2 to 1,  to run pilots with their students; 
measure impact on assignment submission rates, backlogs, and placement preparation activity.  
• Keep the product free for individual students during pilots; institutions contribute via limited sponsorship, lab 
time, and feedback. 
 
Phase 2 – Freemium Student App + Institutional SaaS 
• Freemium app for individual students: 
• Free: core semester planner, basic micro-tutoring, limited squad features. 
• Premium: advanced analytics on strengths/weaknesses, curated interview roadmaps for target roles 
(SDE, data analyst, product, etc.), and deeper integrations (LinkedIn, GitHub, Notion).  
• Institutional subscription: 
• Per-student or per-department pricing for dashboards, squad orchestration, curriculum-level analytics, 
and on-premises or VNET-integrated deployment. 
• White-label option so colleges can brand it as their own “AI Companion”. 
 
Phase 3 – Ecosystem & Marketplace 
• Invite senior students, TAs, and creators to publish “playbooks” (for example, “Crack GATE CS in 6 months”, 
“Non-CS to SDE roadmap”), which the Planner Agent can plug into as templates, sharing revenue when 
students subscribe to premium playbooks. 
• Over time, expand beyond India. 
                                                                                                                        **got idea from various tech app 
 
Additional Information:  
 
There is the opportunity of integrating  the core innovations from the "AI Study Buddy" and "The Next Billion 
Builders" tracks to make this app a complete ecosystem for both learning and creating. The platform would transform 
the study experience by deciphering messy handwritten notes, reading them aloud, and breaking down complex 
concepts with interactive quizzes in both English and local Indian languages. Beyond just studying, we can also add a 
powerful creation engine that empowers anyone—from absolute beginners to seasoned developers—to turn their 
ideas into production-ready, multi-agent AI applications. 
