'use client';

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import "react-circular-progressbar/dist/styles.css";
import AnimatedCircularBar from "../components/AnimatedCircularBar";
import { MdLibraryBooks, MdEmojiEmotions, MdBarChart, MdAutoAwesome, MdVolumeOff, MdFitnessCenter, MdOutlineRecordVoiceOver, MdOutlineMenuBook, MdOutlineTag, MdOutlineVolumeOff, MdOutlineEditNote, MdOutlineAccountTree } from 'react-icons/md';
import { HiOutlineMusicalNote, HiOutlineBookOpen, HiOutlineIdentification, HiOutlineSpeakerWave, HiOutlinePencilSquare, HiOutlineBuildingOffice2 } from 'react-icons/hi2';
import { HiMicrophone } from 'react-icons/hi2';
import DashboardLayout from "../components/DashboardLayout";
import ScrollReveal from "../components/ScrollReveal";
import CollapsibleCard from "../components/CollapsibleCard";
import { EmotionTimelineChart, POSChart, ConfidenceRadar, AnimatedCounter } from "../components/ReportCharts";
import "../components/bg.css";
import { useTheme } from "../context/ThemeContext";
import Markdown from "markdown-to-jsx";
import { API_BASE_URL } from "../constants";
// --- Ensure all logic is inside a React component ---


export default function ReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTranscription, setShowTranscription] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e2e8f0' : '#0f172a';
  const trailColor = isDark ? '#334155' : '#e2e8f0';

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const reportId = searchParams.get("id");
        const reportFromQuery = searchParams.get("report");
        if (reportFromQuery) {
          // If report is passed as a query param (stringified JSON)
          const parsed = JSON.parse(decodeURIComponent(reportFromQuery));
          setReport(parsed);
          setLoading(false);
          return;
        }
        if (reportId) {
          const res = await fetch(`${API_BASE_URL}/report/${reportId}`);
          if (!res.ok) throw new Error("Failed to fetch report");
          const data = await res.json();
          setReport(data);
          setLoading(false);
        } else {
          setError("No report ID provided.");
          setLoading(false);
        }
      } catch (err) {
        setError(err.message || "Failed to load report.");
        setLoading(false);
      }
    };
    setLoading(true);
    setError(null);
    fetchReport();
  }, [searchParams]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-[#FF6A3D] border-t-transparent animate-spin" />
          <div className="text-slate-600 dark:text-slate-400 font-medium">Preparing your report...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !report) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <div className="text-rose-500 font-medium">{error || "Report not found."}</div>
        </div>
      </DashboardLayout>
    );
  }

  // ...existing code...

  const colors = {
    vocab: "#FF9F43",
    voice: "#FF3D71",
    faces: "#FF6A3D"
  };

  const overallScore = Math.round(
    ((report.scores?.vocabulary || 0) + (report.scores?.voice || 0) + (report.scores?.expressions || 0)) / 3
  );

  const la = report.linguistic_analysis || {};

  return (
    <DashboardLayout>
      <div className="flex flex-col w-full max-w-6xl mx-auto p-4 md:p-8 gap-10 pb-20">

        {/* ═══ HERO HEADER ═══ */}
        <ScrollReveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FF6A3D]/10 via-[#FF3D71]/5 to-transparent dark:from-[#FF6A3D]/20 dark:via-[#FF3D71]/10 dark:to-slate-900/50 border border-slate-200/50 dark:border-slate-700/50 p-8 md:p-10">
            {/* Decorative blobs */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#FF6A3D]/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-[#FF3D71]/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FF6A3D]/15 text-[#FF6A3D] dark:bg-[#FF6A3D]/25 uppercase tracking-wider">
                  {report.context || "Session Report"}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {report.date || new Date().toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-slate-800 dark:text-white mb-4 leading-tight">
                {report.title || "Analysis Report"}
              </h1>
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#FF6A3D] to-[#FF3D71]">
                    <AnimatedCounter value={overallScore} />
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400 leading-tight">Overall<br/>Score</span>
                </div>
                {la.vocabulary?.total_words && (
                  <div className="flex items-center gap-2 pl-6 border-l border-slate-300 dark:border-slate-600">
                    <span className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                      <AnimatedCounter value={la.vocabulary.total_words} />
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Words<br/>Spoken</span>
                  </div>
                )}
                {la.sentence_structure?.total_sentences && (
                  <div className="flex items-center gap-2 pl-6 border-l border-slate-300 dark:border-slate-600">
                    <span className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                      <AnimatedCounter value={la.sentence_structure.total_sentences} />
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Total<br/>Sentences</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ═══ SCORES SECTION ═══ */}
        <ScrollReveal delay={100}>
          <section>
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-5 flex items-center gap-2">
              <span className="w-2 h-8 bg-gradient-to-b from-[#FF6A3D] to-[#FF3D71] rounded-full" />
              PERFORMANCE SCORES
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: "Vocabulary", sub: "Richness & Relevance", value: report.scores?.vocabulary || 0, color: colors.vocab, icon: <MdOutlineMenuBook size={24} /> },
                { label: "Voice Quality", sub: "Tone & Pacing", value: report.scores?.voice || 0, color: colors.voice, icon: <MdOutlineRecordVoiceOver size={24} /> },
                { label: "Expressions", sub: "Engagement & Emotion", value: report.scores?.expressions || 0, color: colors.faces, icon: <MdEmojiEmotions size={24} /> },
              ].map((metric, i) => (
                <ScrollReveal key={metric.label} delay={150 + i * 100} direction="scale">
                  <div className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-transparent group-hover:to-[${metric.color}]/5 rounded-2xl transition-all duration-300" />
                    <span className="text-3xl mb-2">{metric.icon}</span>
                    <AnimatedCircularBar
                      className="w-28 h-28 mb-3"
                      targetValue={metric.value}
                      pathColor={metric.color}
                      textColor={textColor}
                      trailColor={trailColor}
                    />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{metric.label}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{metric.sub}</p>
                    <div className="mt-3 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${metric.value}%`, backgroundColor: metric.color }}
                      />
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* ═══ LINGUISTIC INSIGHTS GRID ═══ */}
        {la && Object.keys(la).length > 0 && (
          <ScrollReveal delay={200}>
            <section>
              <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-5 flex items-center gap-2">
                <span className="w-2 h-8 bg-indigo-500 rounded-full" />
                SPEECH ANALYTICS
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* Stat cards */}
                {(() => {
                  const statCards = [
                    { label: "Unique Words", value: la.vocabulary?.unique_words, icon: <MdAutoAwesome size={22} />, color: "text-amber-500" },
                    { label: "Lexical Diversity", value: la.vocabulary?.lexical_diversity, suffix: "", decimals: 3, icon: <MdBarChart size={22} />, color: "text-blue-500" },
                    { label: "Filler Words", value: la.filler_words?.total_count, icon: <MdVolumeOff size={22} />, color: "text-rose-500" },
                    { label: "Confidence Ratio", value: la.confidence_ratio, suffix: "%", icon: <MdFitnessCenter size={22} />, color: "text-emerald-500" },
                  ].filter(s => s.value !== undefined && s.value !== null);
                  return statCards.map((stat, i) => (
                    <ScrollReveal key={stat.label} delay={250 + i * 60} direction="scale">
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center hover:shadow-md transition-shadow">
                        <span className="text-2xl">{stat.icon}</span>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                          <AnimatedCounter
                            value={typeof stat.value === 'number' ? (stat.decimals ? parseFloat(stat.value.toFixed(stat.decimals)) : stat.value) : 0}
                            suffix={stat.suffix || ""}
                          />
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stat.label}</p>
                      </div>
                    </ScrollReveal>
                  ));
                })()}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Radar Chart */}
                {la.vocabulary && (
                  <ScrollReveal delay={300} direction="left">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                      <h4 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4">Speech Confidence Profile</h4>
                      <ConfidenceRadar analysis={la} isDark={isDark} />
                    </div>
                  </ScrollReveal>
                )}

                {/* POS Doughnut */}
                {la.pos_distribution?.details && (
                  <ScrollReveal delay={350} direction="right">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                      <h4 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4">Part of Speech Distribution</h4>
                      <POSChart posDetails={la.pos_distribution.details} isDark={isDark} />
                    </div>
                  </ScrollReveal>
                )}
              </div>

              {/* Detailed Metrics - Expandable */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {la.filler_words && (
                  <ScrollReveal delay={400}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-rose-500 uppercase tracking-wider">Filler Words</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-semibold">
                          {typeof la.filler_words.percentage === 'number' ? la.filler_words.percentage.toFixed(1) : 0}%
                        </span>
                      </div>
                      {/* Mini bar visualization */}
                      <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-2 mb-3">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500 transition-all duration-1000"
                          style={{ width: `${Math.min((la.filler_words.percentage || 0) * 10, 100)}%` }}
                        />
                      </div>
                      {la.filler_words.top_3 && Array.isArray(la.filler_words.top_3) && la.filler_words.top_3.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {la.filler_words.top_3.map(([w, c]) => (
                            <span key={w} className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
                              &quot;{w}&quot; <span className="text-rose-500">×{c}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollReveal>
                )}

                {la.hedge_words && (
                  <ScrollReveal delay={430}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-purple-500 uppercase tracking-wider">Hedge Words</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-semibold">
                          {typeof la.hedge_words.percentage === 'number' ? la.hedge_words.percentage.toFixed(1) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-2 mb-3">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-500 transition-all duration-1000"
                          style={{ width: `${Math.min((la.hedge_words.percentage || 0) * 10, 100)}%` }}
                        />
                      </div>
                      {la.hedge_words.top_3 && Array.isArray(la.hedge_words.top_3) && la.hedge_words.top_3.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {la.hedge_words.top_3.map(([w, c]) => (
                            <span key={w} className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
                              &quot;{w}&quot; <span className="text-purple-500">×{c}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollReveal>
                )}

                {la.power_words && (
                  <ScrollReveal delay={460}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-emerald-500 uppercase tracking-wider">Power Words</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-semibold">
                          {la.power_words.total_count ?? 0} found
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-2 mb-3">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000"
                          style={{ width: `${Math.min((la.power_words.percentage || 0) * 20, 100)}%` }}
                        />
                      </div>
                      {la.power_words.by_category && typeof la.power_words.by_category === 'object' && (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(la.power_words.by_category).filter(([, v]) => v > 0).map(([k, v]) => (
                            <span key={k} className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
                              {k} <span className="text-emerald-500">×{v}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollReveal>
                )}

                {la.sentence_structure && (
                  <ScrollReveal delay={490}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <h4 className="text-sm font-bold text-blue-500 uppercase tracking-wider mb-3">Sentence Structure</h4>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-xl font-bold text-slate-800 dark:text-white">{la.sentence_structure.total_sentences ?? 0}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Sentences</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-slate-800 dark:text-white">{la.sentence_structure.questions ?? 0}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Questions</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-slate-800 dark:text-white">
                            {la.sentence_structure.sentence_length_stats?.avg?.toFixed(1) ?? la.sentence_structure.avg_length?.toFixed(1) ?? '—'}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Avg Length</p>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                )}

                {la.named_entities && (
                  <ScrollReveal delay={520}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-cyan-500 uppercase tracking-wider">Named Entities</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 font-semibold">
                          {la.named_entities.total_entities ?? 0} total
                        </span>
                      </div>
                      {la.named_entities.by_type && typeof la.named_entities.by_type === 'object' && (
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(la.named_entities.by_type).map(([type, items]) => (
                            <span key={type} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                              {type}: {Array.isArray(items) ? items.length : (typeof items === 'number' ? items : 0)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollReveal>
                )}

                {la.vocabulary?.most_common_words && Array.isArray(la.vocabulary.most_common_words) && (
                  <ScrollReveal delay={550}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <h4 className="text-sm font-bold text-amber-500 uppercase tracking-wider mb-3">Top Words</h4>
                      <div className="flex flex-wrap gap-2">
                        {la.vocabulary.most_common_words.slice(0, 10).map(([word, count], i) => (
                          <span
                            key={word}
                            className="px-3 py-1.5 rounded-lg font-medium border transition-transform hover:scale-105"
                            style={{
                              fontSize: `${Math.max(12, 18 - i)}px`,
                              backgroundColor: isDark ? 'rgba(255,159,67,0.1)' : 'rgba(255,159,67,0.08)',
                              borderColor: isDark ? 'rgba(255,159,67,0.3)' : 'rgba(255,159,67,0.2)',
                              color: isDark ? '#fbbf24' : '#d97706',
                            }}
                          >
                            {word} <span className="opacity-50">({count})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </ScrollReveal>
                )}
              </div>
            </section>
          </ScrollReveal>
        )}

        {/* ═══ LINGUISTIC SUMMARY ═══ */}
        {report.linguistic_summary && Object.keys(report.linguistic_summary).length > 0 && (
          <ScrollReveal delay={300}>
            <section>
              <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-5 flex items-center gap-2">
                <span className="w-2 h-8 bg-emerald-500 rounded-full" />
                KEY INSIGHTS
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(report.linguistic_summary).map(([key, value], i) => {
                  const iconMap = {
                    confidence: <MdFitnessCenter size={20} />, // muscle/strength
                    entities: <MdOutlineTag size={20} />, // tag
                    fillers: <MdOutlineVolumeOff size={20} />, // mute
                    pos: <MdOutlineEditNote size={20} />, // note/edit
                    structure: <MdOutlineAccountTree size={20} />, // structure/tree
                    vocabulary: <MdOutlineMenuBook size={20} /> // book
                  };
                  const colorMap = { confidence: "emerald", entities: "cyan", fillers: "rose", pos: "blue", structure: "indigo", vocabulary: "amber" };
                  const matchedKey = Object.keys(iconMap).find(k => key.toLowerCase().includes(k)) || "vocabulary";
                  const icon = iconMap[matchedKey];
                  const clr = colorMap[matchedKey];
                  return (
                    <ScrollReveal key={key} delay={350 + i * 60} direction="scale">
                      <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{icon}</span>
                          <h4 className={`text-sm font-bold text-${clr}-600 dark:text-${clr}-400 uppercase tracking-wider`}>
                            {key.replace(/_/g, ' ')}
                          </h4>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                          {typeof value === 'string' ? value : JSON.stringify(value)}
                        </p>
                      </div>
                    </ScrollReveal>
                  );
                })}
              </div>
            </section>
          </ScrollReveal>
        )}

        {/* ═══ VOCAL EMOTIONS TIMELINE ═══ */}
        {report.vocal_emotions && Array.isArray(report.vocal_emotions) && report.vocal_emotions.length > 0 && (
          <ScrollReveal delay={400}>
            <section>
              <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-5 flex items-center gap-2">
                <span className="w-2 h-8 bg-violet-500 rounded-full" />
                VOCAL EMOTIONS TIMELINE
              </h2>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <EmotionTimelineChart emotions={report.vocal_emotions} isDark={isDark} />
              </div>
            </section>
          </ScrollReveal>
        )}

        {/* ═══ LLM FEEDBACK - COLLAPSIBLE ═══ */}
        <ScrollReveal delay={500}>
          <section>
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-5 flex items-center gap-2">
              <span className="w-2 h-8 bg-rose-500 rounded-full" />
              AI-GENERATED FEEDBACK
            </h2>
            <div className="space-y-4">
              <ScrollReveal delay={520}>
                <CollapsibleCard
                  title="Vocabulary Report"
                  icon={<MdLibraryBooks size={22} />}
                  accentColor={colors.vocab}
                  defaultOpen={true}
                  markdown={true}
                >
                  {typeof report.vocabulary_report === 'string'
                    ? report.vocabulary_report
                    : report.vocabulary_report?.summary || "No vocabulary feedback available."}
                </CollapsibleCard>
              </ScrollReveal>

              <ScrollReveal delay={560}>
                <CollapsibleCard
                  title="Vocal Tone Report"
                  icon={<HiMicrophone size={22} />}
                  accentColor={colors.voice}
                  defaultOpen={false}
                  markdown={true}
                >
                  {report.speech_report || "No vocal analysis available."}
                </CollapsibleCard>
              </ScrollReveal>

              <ScrollReveal delay={600}>
                <CollapsibleCard
                  title="Expression Report"
                  icon={<MdEmojiEmotions size={22} />}
                  accentColor={colors.faces}
                  defaultOpen={false}
                  markdown={true}
                >
                  {report.expression_report || "No expression analysis available."}
                </CollapsibleCard>
              </ScrollReveal>
            </div>
          </section>
        </ScrollReveal>

        {/* ═══ TRANSCRIPTION ═══ */}
        <ScrollReveal delay={650}>
          <section>
            <button
              onClick={() => setShowTranscription(s => !s)}
              className="w-full flex items-center justify-between mb-4 group"
            >
              <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <span className="w-2 h-8 bg-slate-800 dark:bg-slate-400 rounded-full" />
                FULL TRANSCRIPTION
              </h2>
              <span className={`text-sm font-medium text-[#FF6A3D] flex items-center gap-1 transition-all`}>
                {showTranscription ? "Hide" : "Show"}
                <svg className={`w-4 h-4 transition-transform duration-300 ${showTranscription ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>
            <div
              className="overflow-hidden transition-all duration-500 ease-in-out"
              style={{ maxHeight: showTranscription ? "5000px" : "0", opacity: showTranscription ? 1 : 0 }}
            >
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-inner">
                <p className="text-slate-800 dark:text-slate-200 font-mono text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                  {report.transcription || "No transcription available."}
                </p>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* ═══ ACTION BUTTONS ═══ */}
        {report._id && (
          <ScrollReveal delay={700}>
            <div className="flex justify-center gap-4 pt-4 pb-8 flex-wrap">
              <button
                onClick={() => {
                  window.open(`${API_BASE_URL}/report/${report._id}/download`, '_blank');
                }}
                disabled={!report.uploaded_filename}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#FF6A3D] to-[#FF3D71] text-white font-semibold shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Recording
              </button>
            </div>
          </ScrollReveal>
        )}

      </div>
    </DashboardLayout>
  );
}
