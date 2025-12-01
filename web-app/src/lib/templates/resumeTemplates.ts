export interface ResumeTemplate {
  id: string;
  name: string;
  preview?: string;
  content: string;
}

export const resumeTemplates: ResumeTemplate[] = [
  {
    id: "jakes-resume",
    name: "Jake's Resume",
    preview: "/templates/Jake-s-resume.png",
    content: `\\documentclass[a4paper,10pt]{article}

% --- Basic packages only ---
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{xcolor}

% --- Hyperlink setup ---
\\hypersetup{
    colorlinks=true,
    urlcolor=blue,
}

% --- Formatting setup ---
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{4pt}

% --- Custom section style ---
\\newcommand{\\sectiontitle}[1]{\\vspace{10pt}\\textbf{\\large #1}\\vspace{4pt}\\\\\\hrule\\vspace{6pt}}

\\begin{document}

\\begin{center}
    {\\LARGE \\textbf{Jake Smith}}\\\\
    \\vspace{2pt}
    \\href{mailto:jake.smith@email.com}{jake.smith@email.com} \\,|\\, 
    (416) 123-4567 \\,|\\, 
    \\href{https://linkedin.com/in/jakesmith}{linkedin.com/in/jakesmith} \\,|\\, 
    Toronto, ON
\\end{center}

% --- Education ---
\\sectiontitle{Education}
\\textbf{Bachelor of Computer Science}, University of Toronto \\hfill \\textit{Sep 2021 -- Apr 2025}\\\\
CGPA: 3.9/4.0\\\\
Relevant Coursework: Data Structures, Web Development, Databases, AI Fundamentals

% --- Experience ---
\\sectiontitle{Experience}

\\textbf{Software Developer Intern} \\hfill \\textit{RBC, Toronto ON}\\\\
\\textit{May 2024 -- Aug 2024}\\\\
\\begin{itemize}[leftmargin=1.2em]
    \\item Developed and maintained REST APIs in Node.js to automate transaction reports, reducing manual workload by 60\\%.
    \\item Collaborated with a 5-member agile team to implement new authentication flow using OAuth 2.0.
    \\item Conducted system testing and documentation for CI/CD pipelines using Jenkins.
\\end{itemize}

\\textbf{Web Developer (Part-time)} \\hfill \\textit{Freelance}\\\\
\\textit{Jan 2023 -- Present}\\\\
\\begin{itemize}[leftmargin=1.2em]
    \\item Designed and deployed 5+ responsive websites using HTML, CSS, JavaScript, and React.js.
    \\item Optimized page load times by 35\\% through caching and API response tuning.
\\end{itemize}

% --- Projects ---
\\sectiontitle{Projects}

\\textbf{Personal Finance Tracker} | React.js, Node.js, MongoDB\\\\
Developed a full-stack web app that categorizes expenses, displays analytics via charts, and sends bill reminders.

\\textbf{TeachMe (Educational Platform)} | React.js, SQL, Express.js\\\\
Created a platform for uploading and enrolling in online courses, including instructor dashboards and rating systems.

% --- Skills ---
\\sectiontitle{Skills}
\\textbf{Languages:} Python, JavaScript, C, SQL, HTML, CSS\\\\
\\textbf{Frameworks:} React.js, Node.js, Express.js, Flask\\\\
\\textbf{Tools:} Git, Docker, VS Code, Tableau\\\\
\\textbf{Soft Skills:} Communication, Problem Solving, Team Collaboration

\\end{document}
`,
  },
  {
    id: "deedy-resume",
    name: "Deedy Resume",
    preview: "/templates/deedy-resume.png",
    content: `\documentclass[11pt,letterpaper]{article}
\\usepackage[left=0.8in,top=0.8in,right=0.8in,bottom=0.8in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{parskip}

\\hypersetup{
    colorlinks=false,
    pdfborder={0 0 0},
}

\pagestyle{empty}
\setlength{\parindent}{0pt}

\begin{document}

\begin{center}
    {\LARGE \textbf{John Doe}}\\
    \vspace{3pt}
    john.doe@example.com \quad | \quad 111.111.1111
\end{center}

\vspace{8pt}
\hrule
\vspace{10pt}

\begin{minipage}[t]{0.63\textwidth}

\textbf{\large EXPERIENCE}\\[4pt]

\textbf{Company A} \hfill May 2018 -- Aug 2018\\
\textit{Advanced Development Intern, Somewhere, XX}\\[-2pt]
\begin{itemize}[leftmargin=*]
    \item Developed a cloud-based solution to automate network installation using AWS and Python.
    \item Created a system to visualize network telemetry data in real time using AWS, Python, and DOMO.
    \item Contributed to early-stage design for an IoT-based optics-alignment system using reinforcement learning.
\end{itemize}

\textbf{Company B} \hfill Feb 2017 -- Nov 2017\\
\textit{Intern, Somewhere, XX}\\[-2pt]
\begin{itemize}[leftmargin=*]
    \item Coordinated with departments to evaluate software products and produce fit-for-purpose recommendations.
    \item Participated in internal AngularJS projects and blockchain prototype development.
    \item Supported executive team events and technical Q\&A preparation.
\end{itemize}

\textbf{My University ITS} \hfill Aug 2015 -- Oct 2016\\
\textit{Assistant Support Specialist, Somewhere, XX}\\[-2pt]
\begin{itemize}[leftmargin=*]
    \item Helped clients troubleshoot system issues and implement efficient solutions.
    \item Prepared computers for new users and automated common tasks to boost productivity.
\end{itemize}

\vspace{6pt}
\textbf{\large PROJECTS}\\[4pt]

\textbf{Space Robotics Team} \hfill Jan 2019 -- Present\\
\textit{Path-Planning Lead, Somewhere, XX}\\[-2pt]
\begin{itemize}[leftmargin=*]
    \item Led path-planning development for a 3-robot team using Python and ROS.
    \item Implemented autonomous navigation for fully self-operating robots.
\end{itemize}

\textbf{Chit Chat} \hfill Jan 2018 -- May 2019\\
\textit{Class Project, Somewhere, XX}\\[-2pt]
\begin{itemize}[leftmargin=*]
    \item Built an anonymous chat app using PHP backend and AngularJS frontend.
    \item Implemented real-time communication features.
\end{itemize}

\end{minipage}
\hfill
\begin{minipage}[t]{0.33\textwidth}

\textbf{\large EDUCATION}\\[4pt]

\textbf{My University}\\
Bachelor of Science in Computer Science\\
Minors: Mathematics \& Statistics\\
Expected Dec 2019, Somewhere, XX\\
Dean's List (All Semesters)\\
\textit{GPA: 4.0 / 4.0}\\[8pt]

\textbf{\large SKILLS}\\[4pt]
\textbf{Programming:}\\
Python, C/C++, PHP, JavaScript, Matlab, R, SAS\\[4pt]
\textbf{Technology:}\\
Git, AWS, Linux, UNIX, Windows, ROS\\
Artificial Intelligence, Automation\\[8pt]

\textbf{\large COURSEWORK}\\[4pt]
Analysis of Algorithms\\
Artificial Intelligence\\
AI Robotics\\
Operating Systems\\
Calculus I–IV\\
Data Analysis I\\
Intro to Probability\\[8pt]

\textbf{\large SOCIETIES}\\[4pt]
ACM (Association for Computing Machinery)\\
Certified ScrumMaster\\
University Honors College\\
National Merit Finalist\\[8pt]

\textbf{\large LINKS}\\[4pt]
\href{https://github.com/johndoe}{GitHub://JohnDoe}\\
\href{https://linkedin.com/in/johndoe}{LinkedIn://johndoe}

\end{minipage}

\end{document}
`,
  },
  {
    id: "harvard-template",
    name: "Harvard Resume Format",
    preview: "/templates/The-harvard-resume.png",
    content: `\\documentclass[11pt,letterpaper]{article}
\\usepackage[left=1in,top=1in,right=1in,bottom=1in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{parskip}

\\hypersetup{
    colorlinks=false,
    pdfborder={0 0 0},
}

\\pagestyle{empty}
\\setlength{\\parindent}{0pt}

\\begin{document}

%====================
% HEADER
%====================
{\\LARGE \\textbf{Ashton McCarrin}}\\\\
(555) 555-5555 \\\\
\\href{mailto:example@example.com}{example@example.com}

\\vspace{8pt}
\\hrule
\\vspace{8pt}

%====================
% EDUCATION
%====================
\\textbf{\\large Education}\\\\[4pt]

\\textbf{Harvard University} \\hfill May 2023\\\\
\\textit{Master of Liberal Arts, Information Management Systems; GPA: 4.0}\\\\[-4pt]
\\begin{itemize}[leftmargin=*]
    \\item The Detur Book Prize
    \\item Dean's List Academic Achievement Award
    \\item Data Science Project: Driver drowsiness detection
    \\item Capstone Project: Text and voice recognition algorithms
\\end{itemize}

\\textbf{University of Miami} \\hfill Dec 2019\\\\
\\textit{Bachelor of Computer Science}

\\vspace{8pt}
\\hrule
\\vspace{8pt}

%====================
% TECHNICAL SKILLS
%====================
\\textbf{\\large Technical Skills}\\\\[4pt]

\\begin{tabular}{p{2.3in} p{2.3in}}
Infrastructure Platform & Python and Java \\\\
Research Computing & Data management \\\\
Business analysis & User support \\\\
Oracle and SQL server & ETL Data warehouse \\\\
RDBMS tuning & Network Protocols \\\\
Agile and DevOps & Web development \\\\
\\end{tabular}

\\vspace{8pt}
\\hrule
\\vspace{8pt}

%====================
% PROFESSIONAL EXPERIENCE
%====================
\\textbf{\\large Professional Experience}\\\\[4pt]

\\textbf{Epic Technology Solutions LLC} -- Auburn Hills, MI \\hfill Jan 2023 -- Current\\\\
\\textit{Software Developer}\\\\[-2pt]
\\begin{itemize}[leftmargin=*]
    \\item Collaborated with a 13-member team to design and develop web-based applications using ReactJS and Java.
    \\item Integrated server-side logic to improve application performance and scalability.
\\end{itemize}

\\textbf{Carelon Global Solutions} -- Indianapolis, IN \\hfill Aug 2015 -- Jul 2018\\\\
\\textit{Software Developer}\\\\[-2pt]
\\begin{itemize}[leftmargin=*]
    \\item Developed and tested AI engineering components including search and recommendation algorithms, and chatbots.
    \\item Built web solutions and proposals focusing on simplifying processes and improving UX.
\\end{itemize}

\\textbf{KesarWeb} -- Detroit, MI \\hfill Jul 2013 -- Sep 2015\\\\
\\textit{Junior Software Developer}\\\\[-2pt]
\\begin{itemize}[leftmargin=*]
    \\item Monitored internal systems and fixed software bugs in a timely manner.
    \\item Gathered data from customers to improve development processes, contributing to 25\\% of decision-making efforts.
\\end{itemize}

\\vspace{8pt}
\\hrule
\\vspace{8pt}

%====================
% CERTIFICATIONS
%====================
\\textbf{\\large Certifications}\\\\[4pt]
Data Science: Machine Learning course, Harvard University -- \\textit{January 2023}\\\\
ITIL 4 Foundation -- \\textit{January 2022}\\\\
Project Management Professional (PMP)\\textsuperscript{\\textregistered} -- \\textit{March 2021}\\\\
Professional Software Developer Certification -- \\textit{October 2020}

\\end{document}
`,
  },
];
