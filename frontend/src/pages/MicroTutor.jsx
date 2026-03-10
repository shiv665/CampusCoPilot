import { useState } from "react";
import { api } from "../api/client";

export default function MicroTutor() {
  const [tab, setTab] = useState("quiz"); // quiz | flashcards | history
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [numQuestions, setNumQuestions] = useState(5);

  // Quiz state
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Flashcard state
  const [flashcards, setFlashcards] = useState(null);
  const [currentCard, setCurrentCard] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // History
  const [history, setHistory] = useState([]);
  const [expandedHistory, setExpandedHistory] = useState(null);

  const handleGenerateQuiz = async () => {
    if (!topic.trim()) return setError("Enter a topic");
    setLoading(true);
    setError("");
    setQuiz(null);
    setAnswers({});
    setSubmitted(false);
    setScore(null);
    try {
      const res = await api.generateQuiz(topic, difficulty, numQuestions);
      setQuiz(res.quiz);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!quiz) return;
    const questions = quiz.questions || [];
    let correct = 0;
    const answerResults = [];
    questions.forEach((q) => {
      const userAnswer = answers[q.id] || "";
      const isCorrect = userAnswer.toUpperCase() === (q.correct_answer || "").toUpperCase();
      if (isCorrect) correct++;
      answerResults.push({
        question_id: q.id,
        question: q.question,
        options: q.options || [],
        user_answer: userAnswer,
        correct_answer: q.correct_answer || "",
        explanation: q.explanation || "",
        correct: isCorrect,
      });
    });
    setScore({ correct, total: questions.length });
    setSubmitted(true);
    try {
      await api.saveQuizResult(topic, correct, questions.length, answerResults);
    } catch { /* ignore save errors */ }
  };

  const handleGenerateFlashcards = async () => {
    if (!topic.trim()) return setError("Enter a topic");
    setLoading(true);
    setError("");
    setFlashcards(null);
    setCurrentCard(0);
    setFlipped(false);
    try {
      const res = await api.generateFlashcards(topic);
      setFlashcards(res.flashcards);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.quizHistory();
      setHistory(res.results ?? []);
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">🧠 Micro-Tutor</h1>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[["quiz", "📝 Quiz"], ["flashcards", "🃏 Flashcards"], ["resources", "📚 Resources"], ["history", "📊 History"]].map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key); if (key === "history") loadHistory(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${tab === key ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}>{label}</button>
        ))}
      </div>

      {/* Topic Input */}
      {tab !== "history" && (
        <div className="glass p-5 space-y-4">
          <Input label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Enter topic" />
          {tab === "quiz" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <Input label="Questions" type="number" min={1} max={20} value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value) || 5)} />
            </div>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button onClick={tab === "quiz" ? handleGenerateQuiz : handleGenerateFlashcards} disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg">
            {loading ? "⏳ Generating…" : tab === "quiz" ? "Generate Quiz" : tab === "flashcards" ? "Generate Flashcards" : "Find Resources"}
          </button>
        </div>
      )}

      {/* Resources Display */}
      {tab === "resources" && topic.trim() && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-indigo-300">Quick Links for: {topic}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(topic + " tutorial")}`} target="_blank" rel="noopener noreferrer" className="glass p-5 rounded-xl border border-rose-500/30 hover:border-rose-500 transition-colors group flex items-center gap-4 text-left">
              <span className="text-4xl">📺</span>
              <div>
                <h3 className="font-bold text-slate-200 group-hover:text-rose-400 transition-colors">YouTube Videos</h3>
                <p className="text-sm text-slate-400">Search for tutorials and lectures</p>
              </div>
            </a>
            <a href={`https://www.khanacademy.org/search?page_search_query=${encodeURIComponent(topic)}`} target="_blank" rel="noopener noreferrer" className="glass p-5 rounded-xl border border-emerald-500/30 hover:border-emerald-500 transition-colors group flex items-center gap-4 text-left">
              <span className="text-4xl">🏫</span>
              <div>
                <h3 className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">Khan Academy</h3>
                <p className="text-sm text-slate-400">Find structured lessons</p>
              </div>
            </a>
            <a href={`https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(topic)}`} target="_blank" rel="noopener noreferrer" className="glass p-5 rounded-xl border border-slate-500/30 hover:border-slate-500 transition-colors group flex items-center gap-4 text-left">
              <span className="text-4xl">🌐</span>
              <div>
                <h3 className="font-bold text-slate-200 group-hover:text-white transition-colors">Wikipedia</h3>
                <p className="text-sm text-slate-400">Read encyclopedic overviews</p>
              </div>
            </a>
            <a href={`https://scholar.google.com/scholar?q=${encodeURIComponent(topic)}`} target="_blank" rel="noopener noreferrer" className="glass p-5 rounded-xl border border-indigo-500/30 hover:border-indigo-500 transition-colors group flex items-center gap-4 text-left">
              <span className="text-4xl">🎓</span>
              <div>
                <h3 className="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">Google Scholar</h3>
                <p className="text-sm text-slate-400">Find academic papers & PDFs</p>
              </div>
            </a>
          </div>
        </div>
      )}

      {/* Quiz Display */}
      {tab === "quiz" && quiz && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-indigo-300">{quiz.topic} Quiz</h2>
          {(quiz.questions || []).map((q) => (
            <div key={q.id} className="glass p-4 space-y-2">
              <p className="font-medium">Q{q.id}. {q.question}</p>
              {(q.options || []).map((opt, oi) => {
                const letter = opt.charAt(0);
                const isSelected = answers[q.id] === letter;
                const isCorrect = submitted && letter === q.correct_answer;
                const isWrong = submitted && isSelected && letter !== q.correct_answer;
                return (
                  <button key={oi} onClick={() => !submitted && setAnswers((p) => ({ ...p, [q.id]: letter }))}
                    className={`block w-full text-left px-4 py-3 border rounded-lg text-sm font-medium transition-colors shadow-sm ${isCorrect ? "bg-green-50 text-green-700 border-green-300" :
                      isWrong ? "bg-rose-50 text-rose-700 border-rose-300" :
                        isSelected ? "bg-indigo-50 text-indigo-700 border-indigo-300 ring-1 ring-indigo-500" :
                          "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}>{opt}</button>
                );
              })}
              {submitted && q.explanation && (
                <p className="text-xs text-slate-400 mt-1">💡 {q.explanation}</p>
              )}
            </div>
          ))}
          {!submitted ? (
            <button onClick={handleSubmitQuiz}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg">
              ✅ Submit Quiz
            </button>
          ) : (
            <div className="glass p-5 text-center">
              <p className="text-3xl font-bold text-indigo-300">{score.correct}/{score.total}</p>
              <p className="text-slate-400">
                {score.correct === score.total ? "🎉 Perfect score!" :
                  score.correct >= score.total * 0.7 ? "👍 Good job!" :
                    "📚 Keep studying!"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Flashcards Display */}
      {tab === "flashcards" && flashcards && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-indigo-300">Flashcards: {flashcards.topic}</h2>
          {(flashcards.flashcards || []).length > 0 && (
            <>
              <div onClick={() => setFlipped(!flipped)}
                className="glass p-10 text-center cursor-pointer min-h-[200px] flex items-center justify-center transition-all hover:bg-slate-50 shadow-sm border border-slate-200"
                title="Click to flip">
                <div>
                  <p className="text-xs text-slate-500 mb-2">{flipped ? "ANSWER" : "QUESTION"} ({currentCard + 1}/{flashcards.flashcards.length})</p>
                  <p className="text-xl font-medium">
                    {flipped ? flashcards.flashcards[currentCard]?.back : flashcards.flashcards[currentCard]?.front}
                  </p>
                  {flashcards.flashcards[currentCard]?.difficulty && (
                    <p className="text-xs text-slate-500 mt-3">{flashcards.flashcards[currentCard].difficulty}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-center gap-3 mt-4">
                <button onClick={() => { setCurrentCard(Math.max(0, currentCard - 1)); setFlipped(false); }}
                  disabled={currentCard === 0}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-medium rounded-lg text-sm transition-colors shadow-sm">← Previous</button>
                <button onClick={() => setFlipped(!flipped)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm shadow-sm transition-colors">Flip</button>
                <button onClick={() => { setCurrentCard(Math.min(flashcards.flashcards.length - 1, currentCard + 1)); setFlipped(false); }}
                  disabled={currentCard >= flashcards.flashcards.length - 1}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-medium rounded-lg text-sm transition-colors shadow-sm">Next →</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* History */}
      {tab === "history" && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="glass p-10 text-center text-slate-400">
              <p className="text-4xl mb-2">📭</p>
              <p>No quiz results yet.</p>
            </div>
          ) : (
            history.map((h, i) => (
              <div key={i} className="glass overflow-hidden">
                <button
                  onClick={() => setExpandedHistory(expandedHistory === i ? null : i)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="text-left">
                    <p className="font-medium">{h.topic}</p>
                    <p className="text-xs text-slate-400">
                      {h.created_at ? new Date(h.created_at).toLocaleString() : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-lg font-bold ${h.score >= h.total ? "text-green-400" :
                        h.score >= h.total * 0.7 ? "text-indigo-400" : "text-amber-400"
                        }`}>{h.score}/{h.total}</p>
                      <p className="text-xs text-slate-500">{Math.round((h.score / h.total) * 100)}%</p>
                    </div>
                    <span className="text-slate-400 text-sm">{expandedHistory === i ? "▲" : "▼"}</span>
                  </div>
                </button>
                {expandedHistory === i && h.answers && h.answers.length > 0 && (
                  <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/50">
                    {h.answers.map((a, ai) => (
                      <div key={ai} className={`p-3 rounded-lg border text-sm ${a.correct ? "bg-green-50 border-green-200" : "bg-rose-50 border-rose-200"}`}>
                        <p className="font-medium text-slate-800 mb-1">
                          Q{a.question_id || ai + 1}. {a.question || "Question not recorded"}
                        </p>
                        {a.options && a.options.length > 0 && (
                          <div className="space-y-1 my-2">
                            {a.options.map((opt, oi) => {
                              const letter = opt.charAt(0);
                              const isUserPick = letter === a.user_answer;
                              const isCorrectOpt = letter === a.correct_answer;
                              return (
                                <div key={oi} className={`px-2 py-1 rounded text-xs ${isCorrectOpt ? "bg-green-100 text-green-800 font-medium" : isUserPick ? "bg-rose-100 text-rose-800 font-medium" : "text-slate-600"}`}>
                                  {opt} {isCorrectOpt && "✓"} {isUserPick && !isCorrectOpt && "✗"}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className="flex gap-4 text-xs mt-1">
                          <span className={a.correct ? "text-green-700" : "text-rose-700"}>
                            Your answer: {a.user_answer || "—"} {a.correct ? "✓" : "✗"}
                          </span>
                          {!a.correct && a.correct_answer && (
                            <span className="text-green-700">Correct: {a.correct_answer}</span>
                          )}
                        </div>
                        {a.explanation && (
                          <p className="text-xs text-slate-500 mt-1">💡 {a.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input {...props}
        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-shadow" />
    </div>
  );
}
