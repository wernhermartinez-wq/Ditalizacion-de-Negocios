"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { DiagnosticSubmitButtons } from "@/components/app/diagnostic-submit-buttons";
import {
  diagnosticDimensions,
  isQuestionVisible,
  maturityScale,
  type DiagnosticDependency,
  type DiagnosticQuestion,
} from "@/lib/diagnostics";
import { saveDiagnostic } from "@/app/app/diagnostico/actions";

export function DiagnosticQuestionnaire({
  questions,
  dependencies,
  initialAnswers,
}: {
  questions: DiagnosticQuestion[];
  dependencies: DiagnosticDependency[];
  initialAnswers: Record<string, number>;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
  const answerMap = useMemo(() => new Map(Object.entries(answers)), [answers]);
  const visibleQuestions = questions.filter((question) => isQuestionVisible(question, dependencies, answerMap));
  const visibleIds = new Set(visibleQuestions.map((question) => question.id));
  const answered = visibleQuestions.filter((question) => typeof answers[question.id] === "number").length;
  const progress = visibleQuestions.length ? Math.round((answered / visibleQuestions.length) * 100) : 0;

  return (
    <form action={saveDiagnostic} className="diagnostic-form">
      <section className="card diagnostic-method" aria-labelledby="diagnostic-method-title">
        <div>
          <p className="eyebrow">Cómo responder</p>
          <h2 id="diagnostic-method-title">Elige la descripción que puedas sostener con hechos</h2>
          <p>Responde por la práctica habitual de los últimos 12 meses. Algunas preguntas aparecen solo si una respuesta anterior confirma que esa práctica existe.</p>
        </div>
        <div className="diagnostic-scale-key">
          {maturityScale.map((option) => (
            <div key={option.value}><b>{option.value === 0 ? "—" : option.value}</b><span>{option.label}</span><small>{option.description}</small></div>
          ))}
        </div>
      </section>

      <section className="card diagnostic-progress" aria-label="Progreso del cuestionario">
        <div><span>Progreso aplicable</span><strong>{answered} de {visibleQuestions.length} respuestas</strong></div>
        <div className="diagnostic-progress-track"><span style={{ width: `${progress}%` }} /></div>
        <small>{questions.length - visibleQuestions.length} preguntas omitidas por tus respuestas.</small>
      </section>

      {diagnosticDimensions.map((dimension) => {
        const dimensionQuestions = questions.filter((question) => question.dimension === dimension.key && visibleIds.has(question.id));
        if (!dimensionQuestions.length) return null;
        return (
          <fieldset className="card diagnostic-section" key={dimension.key} style={{ "--dimension-color": dimension.color } as CSSProperties}>
            <legend>
              <span className="dimension-code">{dimension.code}</span>
              <span><strong>{dimension.name}</strong><small>Valora la situación actual de la empresa, no el objetivo futuro.</small></span>
            </legend>
            <div className="diagnostic-question-list">
              {dimensionQuestions.map((question) => {
                const conditional = dependencies.some((dependency) => dependency.child_question_id === question.id);
                return (
                  <div className="diagnostic-question" key={question.id}>
                    <div className="diagnostic-question-heading">
                      <span>{question.position}</span>
                      <div>
                        <h3>{question.prompt}</h3>
                        {conditional && <em className="conditional-question-note">Pregunta de seguimiento según tu respuesta anterior</em>}
                        {question.guidance && <p>{question.guidance}</p>}
                        {question.evidence_examples && <small>{question.evidence_examples}</small>}
                      </div>
                    </div>
                    <div className="diagnostic-scale" role="radiogroup" aria-label={question.prompt}>
                      {maturityScale.map((option) => (
                        <label key={option.value}>
                          <input
                            type="radio"
                            name={`question_${question.id}`}
                            value={option.value}
                            checked={answers[question.id] === option.value}
                            onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.value }))}
                          />
                          <span><b>{option.value === 0 ? "—" : option.value}</b><small>{option.short}</small></span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <div className="card diagnostic-footer">
        <p><strong>Antes de finalizar:</strong> revisa que cada respuesta describa la realidad actual. Las preguntas que dejan de aplicar se excluyen automáticamente del cálculo.</p>
        <DiagnosticSubmitButtons />
      </div>
    </form>
  );
}
