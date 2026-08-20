import SkillCategory from '../models/SkillCategory.js';

const foundationalCategories = [
  { name: 'Programming & Development', signatureColor: '#10B981', description: 'OOP, Mobile development, Web app creation, and Clean Code.' },
  { name: 'Systems & Infrastructure', signatureColor: '#3B82F6', description: 'OS, Networking, Distributed systems, and Scalable architecture.' },
  { name: 'Theory & Fundamentals', signatureColor: '#6366F1', description: 'Algorithms, Complexity, DS, and Automata.' },
  { name: 'Data Science & Analytics', signatureColor: '#F59E0B', description: 'Database management, AI/ML, Big data, and Statistics.' },
  { name: 'Security & Forensics', signatureColor: '#EF4444', description: 'Cybersecurity, Cryptography, and Penetration testing.' },
  { name: 'Soft Skills & Business', signatureColor: '#8B5CF6', description: 'Communication, Project management, Ethics, and Entrepreneurship.' },
  { name: 'Applied Mathematics', signatureColor: '#06B6D4', description: 'Discrete math, Calculus, and Linear algebra for computing.' },
  { name: 'Research & Innovation', signatureColor: '#EC4899', description: 'Thesis work, Scientific papers, and Novel tech development.' }
];

export const seedCategories = async () => {
  try {
    for (const cat of foundationalCategories) {
      // Check if it already exists to avoid duplicates
      const exists = await SkillCategory.findOne({ name: cat.name });
      if (!exists) {
        await SkillCategory.create(cat);
        console.log(`✅ Genesis Seeded: ${cat.name}`);
      }
    }
    console.log('🍃 Academic Pillars are locked and loaded.');
  } catch (err) {
    console.error('❌ Seeding Failed:', err);
  }
};

