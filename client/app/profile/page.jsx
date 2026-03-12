"use client";
import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import '../components/bg.css';
import DashboardLayout from '../components/DashboardLayout';
import { User, Briefcase, Code, FileText, GraduationCap, Building2, FolderGit2, Settings2, Plus, X, Upload, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { MdCheckCircle, MdRadioButtonUnchecked } from 'react-icons/md';

const SECTIONS = [
  { id: 'personal', label: 'Personal Info', icon: User },
  { id: 'professional', label: 'Professional', icon: Briefcase },
  { id: 'skills', label: 'Skills', icon: Code },
  { id: 'resume', label: 'Resume', icon: FileText },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'experience', label: 'Experience', icon: Building2 },
  { id: 'projects', label: 'Projects', icon: FolderGit2 },
  { id: 'preferences', label: 'Interview Preferences', icon: Settings2 },
];

const inputClass = "w-full p-3 glass-bg border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50 text-slate-900 dark:text-white transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-500 text-sm";
const labelClass = "text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1.5";
const readOnlyClass = "w-full p-3 glass-bg border border-slate-200 dark:border-slate-600 rounded-xl text-slate-400 dark:text-slate-500 cursor-not-allowed text-sm";

const emptyEducation = { degree: '', university: '', field: '', startYear: '', endYear: '', grade: '' };
const emptyExperience = { title: '', company: '', startDate: '', endDate: '', description: '' };
const emptyProject = { name: '', description: '', technologies: '', github: '', demo: '' };

function SectionHeader({ id, icon: Icon, title, children, isCollapsed, onToggle, sectionRef }) {
  return (
    <div ref={sectionRef} className="pro-card overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF6A3D] to-[#FF3D71] flex items-center justify-center text-white">
            <Icon size={18} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h3>
        </div>
        {isCollapsed ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronUp size={20} className="text-slate-400" />}
      </button>
      {!isCollapsed && <div className="px-5 pb-5 space-y-4 border-t border-slate-100 dark:border-slate-700 pt-4">{children}</div>}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');
  const [collapsedSections, setCollapsedSections] = useState({});
  const sectionRefs = useRef({});

  // Personal Info
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const photoInputRef = useRef(null);

  // Professional
  const [currentRole, setCurrentRole] = useState('');
  const [yearsExp, setYearsExp] = useState('');

  // Skills
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');

  // Resume
  const [resumeFile, setResumeFile] = useState(null);
  const [existingResume, setExistingResume] = useState(null);
  const resumeInputRef = useRef(null);

  // Education
  const [education, setEducation] = useState([{ ...emptyEducation }]);

  // Experience
  const [experience, setExperience] = useState([{ ...emptyExperience }]);

  // Projects
  const [projects, setProjects] = useState([{ ...emptyProject }]);

  // Preferences
  const [interviewTypes, setInterviewTypes] = useState([]);
  const interviewOptions = ['Technical Interview', 'HR Interview', 'System Design', 'Behavioral Interview'];

  // Load profile data on mount
  useEffect(() => {
    const rawEmail = localStorage.getItem('userId');
    const emailVal = rawEmail && rawEmail !== 'undefined' && rawEmail !== 'null' ? rawEmail : '';
    setEmail(emailVal);

    const rawUsername = localStorage.getItem('username');
    setFullName(rawUsername && rawUsername !== 'undefined' ? rawUsername : '');

    async function loadProfile() {
      if (!emailVal) return;
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
        const token = localStorage.getItem('token');
        const res = await fetch(`${API}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.fullName) setFullName(data.fullName);
        if (data.phone) setPhone(data.phone);
        if (data.location) setLocation(data.location);
        if (data.linkedin) setLinkedin(data.linkedin);
        if (data.github) setGithub(data.github);
        if (data.portfolio) setPortfolio(data.portfolio);
        if (data.profilePhoto) setPhotoPreview(data.profilePhoto);
        if (data.currentRole) setCurrentRole(data.currentRole);
        if (data.yearsExp) setYearsExp(data.yearsExp);
        if (data.skills?.length) setSkills(data.skills);
        if (data.existingResume) setExistingResume(data.existingResume);
        if (data.education?.length) setEducation(data.education);
        if (data.experience?.length) setExperience(data.experience);
        if (data.projects?.length) setProjects(data.projects);
        if (data.interviewTypes?.length) setInterviewTypes(data.interviewTypes);
      } catch { /* silent */ }
    }
    loadProfile();
  }, []);

  // Scroll to section
  function scrollToSection(id) {
    setActiveSection(id);
    if (collapsedSections[id]) {
      setCollapsedSections(prev => ({ ...prev, [id]: false }));
    }
    setTimeout(() => {
      sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  function toggleSection(id) {
    setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  }

  // Skills helpers
  function addSkill() {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setSkillInput('');
  }
  function removeSkill(index) {
    setSkills(skills.filter((_, i) => i !== index));
  }

  // Photo handler
  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  }

  // Resume handler
  function handleResumeChange(e) {
    const file = e.target.files?.[0];
    if (file) setResumeFile(file);
  }

  // Multi-entry helpers
  function updateEntry(arr, setArr, index, field, value) {
    const updated = [...arr];
    updated[index] = { ...updated[index], [field]: value };
    setArr(updated);
  }
  function addEntry(arr, setArr, template) {
    setArr([...arr, { ...template }]);
  }
  function removeEntry(arr, setArr, index) {
    if (arr.length <= 1) return;
    setArr(arr.filter((_, i) => i !== index));
  }

  // Interview type toggle
  function toggleInterviewType(type) {
    setInterviewTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }

  // Save
  async function handleSave(e) {
    e.preventDefault();
    if (!email) {
      setStatus({ type: 'error', message: 'Not logged in. Please log in again.' });
      return;
    }
    setSaving(true);
    setStatus(null);

    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('userId', email);
      formData.append('fullName', fullName);
      formData.append('phone', phone);
      formData.append('location', location);
      formData.append('linkedin', linkedin);
      formData.append('github', github);
      formData.append('portfolio', portfolio);
      formData.append('currentRole', currentRole);
      formData.append('yearsExp', yearsExp);
      formData.append('skills', JSON.stringify(skills));
      formData.append('education', JSON.stringify(education));
      formData.append('experience', JSON.stringify(experience));
      formData.append('projects', JSON.stringify(projects));
      formData.append('interviewTypes', JSON.stringify(interviewTypes));
      if (profilePhoto) formData.append('profilePhoto', profilePhoto);
      if (resumeFile) formData.append('resume', resumeFile);

      const res = await fetch(`${API}/auth/profile`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Update failed');
      localStorage.setItem('username', fullName || localStorage.getItem('username'));
      setStatus({ type: 'success', message: 'Profile saved successfully!' });
      if (j.existingResume) setExistingResume(j.existingResume);
      window.dispatchEvent(new Event('profileUpdated'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setStatus({ type: 'error', message: String(err.message || err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="w-full max-w-5xl mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-rose-600">
            Edit Profile
          </h1>
          <div className="flex gap-3">
            <button type="button" onClick={() => router.push('/dashboard')} className="px-5 py-2 glass-bg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:border-amber-500 dark:hover:border-amber-400 transition-all text-sm font-medium">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 btn-gradient text-white rounded-xl hover:shadow-amber-500/50 transition-all text-sm font-medium disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>

        {status && (
          <div className={`text-sm p-3 rounded-xl mb-4 ${status.type === 'error' ? 'text-red-500 dark:text-red-400 glass-bg border border-red-500/30' : 'text-green-500 dark:text-green-400 glass-bg border border-green-500/30'}`}>
            {status.message}
          </div>
        )}

        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <nav className="hidden lg:flex flex-col gap-1 min-w-[200px] sticky top-24 self-start">
            {SECTIONS.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                    activeSection === s.id
                      ? 'bg-gradient-to-r from-amber-500/10 to-rose-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon size={16} />
                  {s.label}
                </button>
              );
            })}
          </nav>

          {/* Form */}
          <form onSubmit={handleSave} className="flex-1 space-y-4">

            {/* 1. Personal Info */}
            <SectionHeader id="personal" icon={User} title="Personal Information" isCollapsed={collapsedSections['personal']} onToggle={toggleSection} sectionRef={el => (sectionRefs.current['personal'] = el)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-100 to-rose-100 dark:from-amber-500/20 dark:to-rose-500/20 flex items-center justify-center overflow-hidden border-2 border-amber-200 dark:border-amber-500/30 flex-shrink-0">
                    {photoPreview ? (
                      <Image src={photoPreview} alt="Profile" width={80} height={80} className="w-full h-full object-cover" unoptimized />
                    ) : (
                      <span className="text-2xl font-bold text-rose-600 dark:text-orange-400">{fullName ? fullName.charAt(0).toUpperCase() : 'U'}</span>
                    )}
                  </div>
                  <div>
                    <button type="button" onClick={() => photoInputRef.current?.click()} className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline">
                      Change Photo
                    </button>
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    <p className="text-xs text-slate-400 mt-0.5">JPG, PNG. Max 2MB.</p>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} placeholder="John Doe" />
                </div>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <input value={email} readOnly className={readOnlyClass} />
                </div>
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="+1 (555) 123-4567" />
                </div>
                <div>
                  <label className={labelClass}>Location</label>
                  <input value={location} onChange={e => setLocation(e.target.value)} className={inputClass} placeholder="City, Country" />
                </div>
                <div>
                  <label className={labelClass}>LinkedIn Profile</label>
                  <input value={linkedin} onChange={e => setLinkedin(e.target.value)} className={inputClass} placeholder="https://linkedin.com/in/yourname" />
                </div>
                <div>
                  <label className={labelClass}>GitHub Profile</label>
                  <input value={github} onChange={e => setGithub(e.target.value)} className={inputClass} placeholder="https://github.com/yourname" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Portfolio / Personal Website</label>
                  <input value={portfolio} onChange={e => setPortfolio(e.target.value)} className={inputClass} placeholder="https://yourportfolio.com" />
                </div>
              </div>
            </SectionHeader>

            {/* 2. Professional */}
            <SectionHeader id="professional" icon={Briefcase} title="Professional Information" isCollapsed={collapsedSections['professional']} onToggle={toggleSection} sectionRef={el => (sectionRefs.current['professional'] = el)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Current Role</label>
                  <select value={currentRole} onChange={e => setCurrentRole(e.target.value)} className={inputClass}>
                    <option value="">Select a role...</option>
                    <option value="Student">Student</option>
                    <option value="Frontend Developer">Frontend Developer</option>
                    <option value="Backend Developer">Backend Developer</option>
                    <option value="Full Stack Developer">Full Stack Developer</option>
                    <option value="Data Scientist">Data Scientist</option>
                    <option value="ML Engineer">ML Engineer</option>
                    <option value="DevOps Engineer">DevOps Engineer</option>
                    <option value="Product Manager">Product Manager</option>
                    <option value="Designer">Designer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Years of Experience</label>
                  <input type="number" min="0" max="50" value={yearsExp} onChange={e => setYearsExp(e.target.value)} className={inputClass} placeholder="0" />
                </div>
              </div>
            </SectionHeader>

            {/* 3. Skills */}
            <SectionHeader id="skills" icon={Code} title="Skills" isCollapsed={collapsedSections['skills']} onToggle={toggleSection} sectionRef={el => (sectionRefs.current['skills'] = el)}>
              <div className="flex gap-2">
                <input
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                  className={inputClass}
                  placeholder="Type a skill and press Enter..."
                />
                <button type="button" onClick={addSkill} className="px-4 py-2 btn-gradient text-white rounded-xl text-sm flex-shrink-0">
                  <Plus size={16} />
                </button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {skills.map((skill, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-amber-500/10 to-rose-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                      {skill}
                      <button type="button" onClick={() => removeSkill(i)} className="hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400">e.g. Java, Python, React, Machine Learning, SQL, AWS</p>
            </SectionHeader>

            {/* 4. Resume */}
            <SectionHeader id="resume" icon={FileText} title="Resume / CV" isCollapsed={collapsedSections['resume']} onToggle={toggleSection} sectionRef={el => (sectionRefs.current['resume'] = el)}>
              {existingResume && (
                <div className="flex items-center gap-3 p-3 glass-bg rounded-xl border border-slate-200 dark:border-slate-600">
                  <FileText size={20} className="text-amber-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">{existingResume}</span>
                  <span className="text-xs text-green-500 font-medium">Uploaded</span>
                </div>
              )}
              <div
                onClick={() => resumeInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-amber-500 dark:hover:border-amber-400 transition-colors"
              >
                <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-400">{resumeFile ? resumeFile.name : 'Click to upload resume (PDF)'}</p>
                <p className="text-xs text-slate-400 mt-1">PDF only. Max 5MB.</p>
                <input ref={resumeInputRef} type="file" accept=".pdf" className="hidden" onChange={handleResumeChange} />
              </div>
            </SectionHeader>

            {/* 5. Education */}
            <SectionHeader id="education" icon={GraduationCap} title="Education" isCollapsed={collapsedSections['education']} onToggle={toggleSection} sectionRef={el => (sectionRefs.current['education'] = el)}>
              {education.map((edu, i) => (
                <div key={i} className="p-4 glass-bg rounded-xl border border-slate-200 dark:border-slate-600 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Education #{i + 1}</span>
                    {education.length > 1 && (
                      <button type="button" onClick={() => removeEntry(education, setEducation, i)} className="text-red-400 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Degree</label>
                      <input value={edu.degree} onChange={e => updateEntry(education, setEducation, i, 'degree', e.target.value)} className={inputClass} placeholder="B.Tech / M.S. / Ph.D." />
                    </div>
                    <div>
                      <label className={labelClass}>University / College</label>
                      <input value={edu.university} onChange={e => updateEntry(education, setEducation, i, 'university', e.target.value)} className={inputClass} placeholder="MIT" />
                    </div>
                    <div>
                      <label className={labelClass}>Field of Study</label>
                      <input value={edu.field} onChange={e => updateEntry(education, setEducation, i, 'field', e.target.value)} className={inputClass} placeholder="Computer Science" />
                    </div>
                    <div>
                      <label className={labelClass}>CGPA / Grade</label>
                      <input value={edu.grade} onChange={e => updateEntry(education, setEducation, i, 'grade', e.target.value)} className={inputClass} placeholder="9.0 / 4.0" />
                    </div>
                    <div>
                      <label className={labelClass}>Start Year</label>
                      <input type="number" min="1980" max="2030" value={edu.startYear} onChange={e => updateEntry(education, setEducation, i, 'startYear', e.target.value)} className={inputClass} placeholder="2020" />
                    </div>
                    <div>
                      <label className={labelClass}>End Year</label>
                      <input type="number" min="1980" max="2035" value={edu.endYear} onChange={e => updateEntry(education, setEducation, i, 'endYear', e.target.value)} className={inputClass} placeholder="2024" />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addEntry(education, setEducation, emptyEducation)} className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline">
                <Plus size={16} /> Add Education
              </button>
            </SectionHeader>

            {/* 6. Experience */}
            <SectionHeader id="experience" icon={Building2} title="Work Experience" isCollapsed={collapsedSections['experience']} onToggle={toggleSection} sectionRef={el => (sectionRefs.current['experience'] = el)}>
              {experience.map((exp, i) => (
                <div key={i} className="p-4 glass-bg rounded-xl border border-slate-200 dark:border-slate-600 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Experience #{i + 1}</span>
                    {experience.length > 1 && (
                      <button type="button" onClick={() => removeEntry(experience, setExperience, i)} className="text-red-400 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Job Title</label>
                      <input value={exp.title} onChange={e => updateEntry(experience, setExperience, i, 'title', e.target.value)} className={inputClass} placeholder="Software Engineer" />
                    </div>
                    <div>
                      <label className={labelClass}>Company</label>
                      <input value={exp.company} onChange={e => updateEntry(experience, setExperience, i, 'company', e.target.value)} className={inputClass} placeholder="Google" />
                    </div>
                    <div>
                      <label className={labelClass}>Start Date</label>
                      <input type="month" value={exp.startDate} onChange={e => updateEntry(experience, setExperience, i, 'startDate', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>End Date</label>
                      <input type="month" value={exp.endDate} onChange={e => updateEntry(experience, setExperience, i, 'endDate', e.target.value)} className={inputClass} />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Description</label>
                      <textarea rows={3} value={exp.description} onChange={e => updateEntry(experience, setExperience, i, 'description', e.target.value)} className={inputClass} placeholder="Key responsibilities and achievements..." />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addEntry(experience, setExperience, emptyExperience)} className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline">
                <Plus size={16} /> Add Experience
              </button>
            </SectionHeader>

            {/* 7. Projects */}
            <SectionHeader id="projects" icon={FolderGit2} title="Projects" isCollapsed={collapsedSections['projects']} onToggle={toggleSection} sectionRef={el => (sectionRefs.current['projects'] = el)}>
              {projects.map((proj, i) => (
                <div key={i} className="p-4 glass-bg rounded-xl border border-slate-200 dark:border-slate-600 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Project #{i + 1}</span>
                    {projects.length > 1 && (
                      <button type="button" onClick={() => removeEntry(projects, setProjects, i)} className="text-red-400 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Project Name</label>
                      <input value={proj.name} onChange={e => updateEntry(projects, setProjects, i, 'name', e.target.value)} className={inputClass} placeholder="My Awesome Project" />
                    </div>
                    <div>
                      <label className={labelClass}>Technologies Used</label>
                      <input value={proj.technologies} onChange={e => updateEntry(projects, setProjects, i, 'technologies', e.target.value)} className={inputClass} placeholder="React, Node.js, MongoDB" />
                    </div>
                    <div>
                      <label className={labelClass}>GitHub Link</label>
                      <input value={proj.github} onChange={e => updateEntry(projects, setProjects, i, 'github', e.target.value)} className={inputClass} placeholder="https://github.com/..." />
                    </div>
                    <div>
                      <label className={labelClass}>Live Demo Link</label>
                      <input value={proj.demo} onChange={e => updateEntry(projects, setProjects, i, 'demo', e.target.value)} className={inputClass} placeholder="https://yourapp.com" />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Description</label>
                      <textarea rows={3} value={proj.description} onChange={e => updateEntry(projects, setProjects, i, 'description', e.target.value)} className={inputClass} placeholder="What does this project do?" />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addEntry(projects, setProjects, emptyProject)} className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline">
                <Plus size={16} /> Add Project
              </button>
            </SectionHeader>

            {/* 8. Interview Preferences */}
            <SectionHeader id="preferences" icon={Settings2} title="Interview Preferences" isCollapsed={collapsedSections['preferences']} onToggle={toggleSection} sectionRef={el => (sectionRefs.current['preferences'] = el)}>
              <p className="text-sm text-slate-500 dark:text-slate-400">Select the types of interviews you want to practice:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {interviewOptions.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleInterviewType(type)}
                    className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${
                      interviewTypes.includes(type)
                        ? 'border-amber-500 bg-gradient-to-r from-amber-500/10 to-rose-500/10 text-amber-700 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-amber-300 dark:hover:border-amber-500/50'
                    }`}
                  >
                    <span className="mr-2">{interviewTypes.includes(type) ? <MdCheckCircle size={18} className="text-amber-500" /> : <MdRadioButtonUnchecked size={18} className="text-slate-400 dark:text-slate-500" />}</span>
                    {type}
                  </button>
                ))}
              </div>
            </SectionHeader>

            {/* Bottom Save */}
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => router.push('/dashboard')} className="px-6 py-2.5 glass-bg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:border-amber-500 dark:hover:border-amber-400 transition-all text-sm font-medium">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-6 py-2.5 btn-gradient text-white rounded-xl hover:shadow-amber-500/50 transition-all text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
