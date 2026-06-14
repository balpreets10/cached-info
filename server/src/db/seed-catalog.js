/**
 * Demo-data seed: fills the three taxonomies (universities -> domains -> subjects,
 * skill_categories -> skills, exam_categories -> exams) and a large set of approved
 * resources attached to them, so browse / search / filter screens have content.
 *
 * Idempotent and safe to re-run:
 *   - catalog rows upsert on their UNIQUE constraints (DO UPDATE updated_at).
 *   - all resources are owned by a dedicated seed user; on each run that user's
 *     resources are deleted and re-inserted, so real user submissions are never touched.
 *
 * Dev-data only — do NOT wire into deploy. Run with: npm run seed:catalog:dev
 */
import pool from '../db.js';

const SEED_USER = {
  googleId: 'seed-system',
  email: 'seed@cachedinfo.local',
  fullName: 'Seed Bot',
};

// --- Catalog data -----------------------------------------------------------
// universities -> domains -> subjects
const UNIVERSITIES = [
  {
    name: 'MIT',
    domains: {
      'Computer Science': ['Data Structures', 'Operating Systems', 'Artificial Intelligence', 'Algorithms'],
      'Electrical Engineering': ['Signals and Systems', 'Circuits'],
      Mathematics: ['Linear Algebra', 'Calculus', 'Probability'],
    },
  },
  {
    name: 'Stanford University',
    domains: {
      'Computer Science': ['Machine Learning', 'Databases', 'Computer Networks'],
      Mathematics: ['Discrete Mathematics', 'Statistics'],
    },
  },
  {
    name: 'IIT Bombay',
    domains: {
      'Computer Science': ['Compilers', 'Theory of Computation', 'Data Structures'],
      'Electrical Engineering': ['Digital Logic Design', 'Control Systems'],
      'Mechanical Engineering': ['Thermodynamics', 'Fluid Mechanics'],
    },
  },
  {
    name: 'University of Toronto',
    domains: {
      'Computer Science': ['Software Engineering', 'Operating Systems'],
      Mathematics: ['Real Analysis', 'Linear Algebra'],
    },
  },
  {
    name: 'University of Oxford',
    domains: {
      'Computer Science': ['Functional Programming', 'Computer Architecture'],
      Physics: ['Quantum Mechanics', 'Classical Mechanics'],
    },
  },
  {
    name: 'National University of Singapore',
    domains: {
      'Computer Science': ['Data Structures', 'Computer Networks'],
      'Business Analytics': ['Data Visualization', 'Optimization'],
    },
  },
];

// skill_categories -> skills
const SKILL_CATEGORIES = {
  Programming: ['JavaScript', 'TypeScript', 'Python', 'Rust', 'Go', 'C++', 'Java'],
  'Web Development': ['React', 'Node.js', 'Next.js', 'HTML & CSS', 'GraphQL'],
  'Data & AI': ['SQL', 'PyTorch', 'TensorFlow', 'Pandas', 'Machine Learning'],
  Design: ['Figma', 'UI/UX Design', 'Adobe Photoshop'],
  DevOps: ['Docker', 'Kubernetes', 'Linux', 'CI/CD'],
};

// exam_categories -> exams
const EXAM_CATEGORIES = {
  'Engineering Entrance': ['JEE Main', 'JEE Advanced', 'GATE', 'BITSAT'],
  'Civil Services': ['UPSC CSE', 'State PCS'],
  'Graduate Admissions': ['GRE', 'GMAT', 'CAT', 'TOEFL'],
  'Medical Entrance': ['NEET UG', 'NEET PG'],
  Finance: ['CFA', 'FRM', 'CA Foundation'],
};

// --- Resources --------------------------------------------------------------
// Each resource attaches to exactly one of: subject (university branch),
// skill, or exam. Parents are referenced by name; resolved to ids at insert.
const UNIVERSITY_RESOURCES = [
  { subject: 'Data Structures', title: 'MIT 6.006 Introduction to Algorithms (OCW)', url: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/', description: 'Full MIT lecture series covering data structures and algorithm design.', topic: 'Hash tables' },
  { subject: 'Data Structures', title: 'Abdul Bari — Data Structures Playlist', url: 'https://www.youtube.com/playlist?list=PLDN4rrl48XKpZkf03iYFl-O29szjTrs_O', description: 'Visual, beginner-friendly walkthrough of core data structures.' },
  { subject: 'Operating Systems', title: 'OSTEP — Operating Systems: Three Easy Pieces', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/', description: 'Free, widely used operating systems textbook.', topic: 'Concurrency' },
  { subject: 'Operating Systems', title: 'MIT 6.S081 Operating System Engineering', url: 'https://pdos.csail.mit.edu/6.S081/', description: 'Hands-on xv6-based OS engineering course.' },
  { subject: 'Artificial Intelligence', title: 'CS188 Intro to AI — UC Berkeley', url: 'https://inst.eecs.berkeley.edu/~cs188/', description: 'Search, CSPs, MDPs, and reinforcement learning fundamentals.' },
  { subject: 'Algorithms', title: 'Introduction to Algorithms (CLRS)', url: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/', description: 'The canonical algorithms reference text.' },
  { subject: 'Linear Algebra', title: 'MIT 18.06 Linear Algebra — Gilbert Strang', url: 'https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/', description: 'Classic linear algebra lectures by Gilbert Strang.', topic: 'Eigenvalues' },
  { subject: 'Linear Algebra', title: '3Blue1Brown — Essence of Linear Algebra', url: 'https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab', description: 'Geometric intuition behind linear algebra.' },
  { subject: 'Calculus', title: 'Khan Academy — Calculus', url: 'https://www.khanacademy.org/math/calculus-1', description: 'Comprehensive calculus course with exercises.' },
  { subject: 'Probability', title: 'MIT 6.041 Probabilistic Systems Analysis', url: 'https://ocw.mit.edu/courses/6-041-probabilistic-systems-analysis-and-applied-probability-fall-2010/', description: 'Probability theory and its applications.' },
  { subject: 'Machine Learning', title: 'Stanford CS229 Machine Learning', url: 'https://cs229.stanford.edu/', description: "Andrew Ng's foundational machine learning course." },
  { subject: 'Databases', title: 'CMU 15-445 Database Systems', url: 'https://15445.courses.cs.cmu.edu/', description: 'In-depth database internals course.' },
  { subject: 'Computer Networks', title: 'Stanford CS144 Introduction to Computer Networking', url: 'https://cs144.github.io/', description: 'Build your own TCP/IP stack.' },
  { subject: 'Discrete Mathematics', title: 'MIT 6.042J Mathematics for Computer Science', url: 'https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/', description: 'Discrete math foundations for CS.' },
  { subject: 'Statistics', title: 'Khan Academy — Statistics and Probability', url: 'https://www.khanacademy.org/math/statistics-probability', description: 'Statistics fundamentals with practice.' },
  { subject: 'Compilers', title: 'Stanford Compilers (Crafting a Compiler)', url: 'https://www.edx.org/learn/computer-science/stanford-university-compilers', description: 'Lexing, parsing, and code generation.' },
  { subject: 'Theory of Computation', title: 'Michael Sipser — Theory of Computation Lectures', url: 'https://www.youtube.com/playlist?list=PLN6cZ3LSW2-ATl5BZJSRcZpQT9Pn9wbgI', description: 'Automata, computability, and complexity.' },
  { subject: 'Digital Logic Design', title: 'NPTEL — Digital Circuits', url: 'https://nptel.ac.in/courses/108105132', description: 'Combinational and sequential logic design.' },
  { subject: 'Control Systems', title: 'Brian Douglas — Control Systems Lectures', url: 'https://www.youtube.com/@BrianBDouglas', description: 'Intuitive control theory explainers.' },
  { subject: 'Thermodynamics', title: 'NPTEL — Basic Thermodynamics', url: 'https://nptel.ac.in/courses/112105123', description: 'First and second law, cycles, and applications.' },
  { subject: 'Fluid Mechanics', title: 'NPTEL — Fluid Mechanics', url: 'https://nptel.ac.in/courses/112105171', description: 'Fluid statics and dynamics.' },
  { subject: 'Software Engineering', title: 'The Missing Semester of Your CS Education', url: 'https://missing.csail.mit.edu/', description: 'Tooling: shell, git, debugging, and more.' },
  { subject: 'Real Analysis', title: 'MIT 18.100A Real Analysis', url: 'https://ocw.mit.edu/courses/18-100a-real-analysis-fall-2020/', description: 'Rigorous real analysis course.' },
  { subject: 'Functional Programming', title: 'Haskell — Learn You a Haskell for Great Good', url: 'http://learnyouahaskell.com/', description: 'Gentle introduction to functional programming.' },
  { subject: 'Computer Architecture', title: 'Nand2Tetris', url: 'https://www.nand2tetris.org/', description: 'Build a computer from first principles.' },
  { subject: 'Quantum Mechanics', title: 'MIT 8.04 Quantum Physics I', url: 'https://ocw.mit.edu/courses/8-04-quantum-physics-i-spring-2013/', description: 'Introductory quantum mechanics.' },
  { subject: 'Classical Mechanics', title: 'Feynman Lectures on Physics — Vol I', url: 'https://www.feynmanlectures.caltech.edu/', description: 'Classic physics lectures, freely available.' },
  { subject: 'Data Visualization', title: 'Storytelling with Data', url: 'https://www.storytellingwithdata.com/', description: 'Principles of effective data visualization.' },
  { subject: 'Optimization', title: 'Stanford EE364A Convex Optimization', url: 'https://web.stanford.edu/class/ee364a/', description: 'Convex optimization theory and applications.' },
];

const SKILL_RESOURCES = [
  { skill: 'JavaScript', title: 'MDN JavaScript Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', description: "The web's reference guide for JavaScript." },
  { skill: 'JavaScript', title: 'JavaScript.info — The Modern JavaScript Tutorial', url: 'https://javascript.info/', description: 'From basics to advanced topics, with examples.' },
  { skill: 'TypeScript', title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/intro.html', description: 'Official TypeScript documentation.' },
  { skill: 'Python', title: 'Official Python Tutorial', url: 'https://docs.python.org/3/tutorial/', description: 'The canonical Python getting-started tutorial.' },
  { skill: 'Python', title: 'Automate the Boring Stuff with Python', url: 'https://automatetheboringstuff.com/', description: 'Practical Python for everyday automation.' },
  { skill: 'Rust', title: 'The Rust Programming Language (The Book)', url: 'https://doc.rust-lang.org/book/', description: 'Official, comprehensive Rust book.' },
  { skill: 'Go', title: 'A Tour of Go', url: 'https://go.dev/tour/', description: 'Interactive introduction to Go.' },
  { skill: 'C++', title: 'learncpp.com', url: 'https://www.learncpp.com/', description: 'Thorough, free C++ tutorial series.' },
  { skill: 'Java', title: 'Java Programming MOOC — University of Helsinki', url: 'https://java-programming.mooc.fi/', description: 'Free, hands-on Java course.' },
  { skill: 'React', title: 'React Official Docs', url: 'https://react.dev/learn', description: 'Modern React documentation and tutorials.' },
  { skill: 'React', title: 'freeCodeCamp — Front End Development Libraries', url: 'https://www.freecodecamp.org/learn/front-end-development-libraries/', description: 'Project-based React curriculum.' },
  { skill: 'Node.js', title: 'Node.js Official Guides', url: 'https://nodejs.org/en/learn', description: 'Official Node.js learning resources.' },
  { skill: 'Next.js', title: 'Next.js Learn', url: 'https://nextjs.org/learn', description: 'Interactive Next.js course from Vercel.' },
  { skill: 'HTML & CSS', title: 'web.dev — Learn CSS', url: 'https://web.dev/learn/css', description: "Google's structured CSS course." },
  { skill: 'GraphQL', title: 'How to GraphQL', url: 'https://www.howtographql.com/', description: 'Full-stack GraphQL tutorial.' },
  { skill: 'SQL', title: 'SQLBolt — Learn SQL Interactively', url: 'https://sqlbolt.com/', description: 'Hands-on SQL lessons in the browser.' },
  { skill: 'PyTorch', title: 'PyTorch Official Tutorials', url: 'https://pytorch.org/tutorials/', description: 'Deep learning with PyTorch, from basics up.' },
  { skill: 'TensorFlow', title: 'TensorFlow Tutorials', url: 'https://www.tensorflow.org/tutorials', description: 'Official TensorFlow learning path.' },
  { skill: 'Pandas', title: 'Pandas — Getting Started', url: 'https://pandas.pydata.org/docs/getting_started/index.html', description: 'Official pandas tutorials.' },
  { skill: 'Machine Learning', title: 'Machine Learning Crash Course — Google', url: 'https://developers.google.com/machine-learning/crash-course', description: "Google's fast-paced practical ML intro." },
  { skill: 'Figma', title: 'Figma Learn — Design Basics', url: 'https://help.figma.com/hc/en-us/categories/360002051613', description: 'Official Figma learning center.' },
  { skill: 'UI/UX Design', title: 'Refactoring UI', url: 'https://www.refactoringui.com/', description: 'Practical UI design tactics for developers.' },
  { skill: 'Adobe Photoshop', title: 'Adobe Photoshop Tutorials', url: 'https://helpx.adobe.com/photoshop/tutorials.html', description: 'Official Photoshop tutorials.' },
  { skill: 'Docker', title: 'Docker Get Started Guide', url: 'https://docs.docker.com/get-started/', description: 'Official Docker onboarding.' },
  { skill: 'Kubernetes', title: 'Kubernetes Basics', url: 'https://kubernetes.io/docs/tutorials/kubernetes-basics/', description: 'Interactive Kubernetes tutorial.' },
  { skill: 'Linux', title: 'Linux Journey', url: 'https://linuxjourney.com/', description: 'Learn Linux from the ground up.' },
  { skill: 'CI/CD', title: 'GitHub Actions Documentation', url: 'https://docs.github.com/en/actions', description: 'Automate workflows with GitHub Actions.' },
];

const EXAM_RESOURCES = [
  { exam: 'JEE Main', title: 'NTA JEE Main Official Portal', url: 'https://jeemain.nta.nic.in/', description: 'Official notifications, syllabus, and papers.' },
  { exam: 'JEE Main', title: 'NCERT Textbooks (Class 11 & 12)', url: 'https://ncert.nic.in/textbook.php', description: 'Core syllabus textbooks for JEE preparation.' },
  { exam: 'JEE Advanced', title: 'JEE Advanced Official Site', url: 'https://jeeadv.ac.in/', description: 'Previous papers, syllabus, and announcements.' },
  { exam: 'GATE', title: 'GATE Official Portal (IISc/IITs)', url: 'https://gate2024.iisc.ac.in/', description: 'Official GATE information and syllabus.' },
  { exam: 'GATE', title: 'NPTEL Courses', url: 'https://nptel.ac.in/', description: 'University-level lectures aligned to GATE topics.' },
  { exam: 'BITSAT', title: 'BITSAT Official Admissions', url: 'https://www.bitsadmission.com/', description: 'Official BITSAT exam information.' },
  { exam: 'UPSC CSE', title: 'UPSC Official Website', url: 'https://www.upsc.gov.in/', description: 'Notifications, syllabus, and previous papers.' },
  { exam: 'UPSC CSE', title: 'PIB — Press Information Bureau', url: 'https://www.pib.gov.in/', description: 'Current affairs source for civil services prep.' },
  { exam: 'State PCS', title: 'Drishti IAS — State PCS Resources', url: 'https://www.drishtiias.com/', description: 'Study material and current affairs.' },
  { exam: 'GRE', title: 'ETS GRE Official Prep', url: 'https://www.ets.org/gre/test-takers/general-test/prepare.html', description: 'Official GRE practice materials.' },
  { exam: 'GMAT', title: 'GMAT Official Prep (mba.com)', url: 'https://www.mba.com/exams/gmat-exam', description: 'Official GMAT preparation resources.' },
  { exam: 'CAT', title: 'IIM CAT Official Site', url: 'https://iimcat.ac.in/', description: 'Official CAT registration and information.' },
  { exam: 'TOEFL', title: 'ETS TOEFL Official Prep', url: 'https://www.ets.org/toefl/test-takers/ibt/prepare.html', description: 'Official TOEFL iBT practice.' },
  { exam: 'NEET UG', title: 'NTA NEET Official Portal', url: 'https://neet.nta.nic.in/', description: 'Official NEET UG notifications and syllabus.' },
  { exam: 'NEET PG', title: 'NBEMS NEET-PG Information', url: 'https://natboard.edu.in/', description: 'Official NEET PG conducting body.' },
  { exam: 'CFA', title: 'CFA Institute — Program Curriculum', url: 'https://www.cfainstitute.org/programs/cfa', description: 'Official CFA program information.' },
  { exam: 'FRM', title: 'GARP — FRM Certification', url: 'https://www.garp.org/frm', description: 'Official Financial Risk Manager program.' },
  { exam: 'CA Foundation', title: 'ICAI — CA Foundation Resources', url: 'https://www.icai.org/', description: 'Official study material from ICAI.' },
];

/** Upsert one catalog row; returns its id. db is the bound client.query. */
async function upsert(db, table, conflictCols, row) {
  const cols = Object.keys(row);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await db(
    `INSERT INTO ${table} (${cols.join(', ')})
     VALUES (${placeholders})
     ON CONFLICT (${conflictCols.join(', ')}) DO UPDATE SET updated_at = now()
     RETURNING id`,
    cols.map((c) => row[c]),
  );
  return rows[0].id;
}

async function seed() {
  const client = await pool.connect();
  const db = (text, params) => client.query(text, params);
  try {
    await client.query('BEGIN');

    // --- Seed system user (owns all seeded resources) -----------------------
    const { rows: userRows } = await db(
      `INSERT INTO users (google_id, email, full_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET updated_at = now()
       RETURNING id`,
      [SEED_USER.googleId, SEED_USER.email, SEED_USER.fullName],
    );
    const seedUserId = userRows[0].id;

    // --- Catalog: build name -> id lookups so resources can resolve parents -
    const subjectIds = new Map();
    const skillIds = new Map();
    const examIds = new Map();

    for (const uni of UNIVERSITIES) {
      const universityId = await upsert(db, 'universities', ['name'], { name: uni.name });
      for (const [domainName, subjects] of Object.entries(uni.domains)) {
        const domainId = await upsert(db, 'domains', ['university_id', 'name'], {
          name: domainName,
          university_id: universityId,
        });
        for (const subjectName of subjects) {
          const subjectId = await upsert(db, 'subjects', ['domain_id', 'name'], {
            name: subjectName,
            domain_id: domainId,
          });
          // Subjects can repeat names across domains; last writer wins for the lookup,
          // which is fine — resource->subject mapping uses representative names.
          subjectIds.set(subjectName, subjectId);
        }
      }
    }

    for (const [categoryName, skills] of Object.entries(SKILL_CATEGORIES)) {
      const categoryId = await upsert(db, 'skill_categories', ['name'], { name: categoryName });
      for (const skillName of skills) {
        const skillId = await upsert(db, 'skills', ['skill_category_id', 'name'], {
          name: skillName,
          skill_category_id: categoryId,
        });
        skillIds.set(skillName, skillId);
      }
    }

    for (const [categoryName, exams] of Object.entries(EXAM_CATEGORIES)) {
      const categoryId = await upsert(db, 'exam_categories', ['name'], { name: categoryName });
      for (const examName of exams) {
        const examId = await upsert(db, 'exams', ['exam_category_id', 'name'], {
          name: examName,
          exam_category_id: categoryId,
        });
        examIds.set(examName, examId);
      }
    }

    // --- Resources: wipe this seed user's prior rows, then re-insert --------
    await db('DELETE FROM resources WHERE submitted_by = $1', [seedUserId]);

    const insertResource = (cols) =>
      db(
        `INSERT INTO resources
           (title, description, url, subject_id, skill_id, exam_id, topic, submitted_by, is_approved)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
        cols,
      );

    let count = 0;
    for (const r of UNIVERSITY_RESOURCES) {
      const subjectId = subjectIds.get(r.subject);
      if (!subjectId) throw new Error(`Unknown subject for resource: ${r.subject}`);
      await insertResource([r.title, r.description ?? null, r.url, subjectId, null, null, r.topic ?? null, seedUserId]);
      count++;
    }
    for (const r of SKILL_RESOURCES) {
      const skillId = skillIds.get(r.skill);
      if (!skillId) throw new Error(`Unknown skill for resource: ${r.skill}`);
      await insertResource([r.title, r.description ?? null, r.url, null, skillId, null, r.topic ?? null, seedUserId]);
      count++;
    }
    for (const r of EXAM_RESOURCES) {
      const examId = examIds.get(r.exam);
      if (!examId) throw new Error(`Unknown exam for resource: ${r.exam}`);
      await insertResource([r.title, r.description ?? null, r.url, null, null, examId, r.topic ?? null, seedUserId]);
      count++;
    }

    await client.query('COMMIT');
    console.log(
      `[seed-catalog] Done: ${subjectIds.size} subjects, ${skillIds.size} skills, ` +
        `${examIds.size} exams, ${count} approved resources (owner: ${SEED_USER.email}).`,
    );
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seed-catalog] Failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
