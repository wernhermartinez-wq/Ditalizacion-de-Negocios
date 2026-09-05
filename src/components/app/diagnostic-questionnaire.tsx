"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { DiagnosticSubmitButtons } from "@/components/app/diagnostic-submit-buttons";
import {
  acquisitionChannels,
  channelAttributionLabel,
  diagnosticDimensions,
  isQuestionVisible,
  maturityScale,
  normalizeChannelAttributionDetails,
  scoreChannelAttribution,
  type ChannelAttributionDetails,
  type DiagnosticDependency,
  type DiagnosticQuestion,
} from "@/lib/diagnostics";
import { saveDiagnostic } from "@/app/app/diagnostico/actions";

function ChannelAttributionQuestion({
  question,
  details,
  onChange,
}: {
  question: DiagnosticQuestion;
  details: ChannelAttributionDetails;
  onChange: (details: ChannelAttributionDetails) => void;
}) {
  const score = scoreChannelAttribution(details);
  const usedSet = new Set(details.usedChannels);
  const provenSet = new Set(details.provenChannels);

  const updateUsedChannel = (channel: string, checked: boolean) => {
    const usedChannels = checked
      ? [...details.usedChannels, channel]
      : details.usedChannels.filter((item) => item !== channel);
    onChange(normalizeChannelAttributionDetails({
      ...details,
      usedChannels,
      provenChannels: details.provenChannels.filter((item) => usedChannels.includes(item)),
      unknownChannels: false,
    }));
  };

  const updateProvenChannel = (channel: string, checked: boolean) => {
    onChange(normalizeChannelAttributionDetails({
      ...details,
      provenChannels: checked
        ? [...details.provenChannels, channel]
        : details.provenChannels.filter((item) => item !== channel),
    }));
  };

  return (
    <div className="channel-attribution">
      {score !== null && <input type="hidden" name={`question_${question.id}`} value={score} />}

      <div className="channel-step">
        <div className="channel-step-heading"><b>1</b><span><strong>Canales que utilizas</strong><small>Puedes seleccionar uno, varios o todos.</small></span></div>
        <div className="channel-actions">
          <button
            type="button"
            onClick={() => onChange(normalizeChannelAttributionDetails({ ...details, usedChannels: acquisitionChannels.map((channel) => channel.value), unknownChannels: false }))}
          >Seleccionar todos</button>
          <label className="channel-unknown">
            <input
              type="checkbox"
              name={`channels_unknown_${question.id}`}
              value="true"
              checked={details.unknownChannels}
              onChange={(event) => onChange(normalizeChannelAttributionDetails({ ...details, unknownChannels: event.target.checked }))}
            />
            <span>No sé qué canales utilizamos</span>
          </label>
        </div>
        <div className="channel-grid">
          {acquisitionChannels.map((channel) => (
            <label key={channel.value}>
              <input
                type="checkbox"
                name={`channels_used_${question.id}`}
                value={channel.value}
                checked={usedSet.has(channel.value)}
                disabled={details.unknownChannels}
                onChange={(event) => updateUsedChannel(channel.value, event.target.checked)}
              />
              <span>{channel.label}</span>
            </label>
          ))}
        </div>
      </div>

      {details.usedChannels.length > 0 && (
        <div className="channel-step">
          <div className="channel-step-heading"><b>2</b><span><strong>Canales con resultados comprobables</strong><small>Marca solo aquellos en los que puedes comprobar consultas o ventas reales.</small></span></div>
          <div className="channel-grid channel-grid-proven">
            {acquisitionChannels.filter((channel) => usedSet.has(channel.value)).map((channel) => (
              <label key={channel.value}>
                <input
                  type="checkbox"
                  name={`channels_proven_${question.id}`}
                  value={channel.value}
                  checked={provenSet.has(channel.value)}
                  onChange={(event) => updateProvenChannel(channel.value, event.target.checked)}
                />
                <span>{channel.label}</span>
              </label>
            ))}
          </div>
          <label className="channel-measurement">
            <input
              type="checkbox"
              name={`channels_measured_${question.id}`}
              value="true"
              checked={details.tracksPerformance}
              onChange={(event) => onChange(normalizeChannelAttributionDetails({ ...details, tracksPerformance: event.target.checked }))}
            />
            <span><strong>Además, medimos conversión o coste por resultado y hacemos mejoras.</strong><small>Esta evidencia solo lleva al nivel máximo cuando puedes comprobar resultados en todos los canales seleccionados.</small></span>
          </label>
        </div>
      )}

      <div className={`channel-score ${score === null ? "is-pending" : ""}`} aria-live="polite">
        <span>Nivel calculado</span><strong>{score === null ? "Pendiente" : `${score} de 5`}</strong><small>{channelAttributionLabel(score)}</small>
      </div>
    </div>
  );
}

export function DiagnosticQuestionnaire({
  questions,
  dependencies,
  initialAnswers,
  initialDetails,
}: {
  questions: DiagnosticQuestion[];
  dependencies: DiagnosticDependency[];
  initialAnswers: Record<string, number>;
  initialDetails: Record<string, ChannelAttributionDetails>;
}) {
  const [detailsByQuestion, setDetailsByQuestion] = useState<Record<string, ChannelAttributionDetails>>(initialDetails);
  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    const next = { ...initialAnswers };
    questions.filter((question) => question.response_type === "channel_attribution").forEach((question) => {
      const score = scoreChannelAttribution(initialDetails[question.id] ?? normalizeChannelAttributionDetails({}));
      if (score === null) delete next[question.id];
      else next[question.id] = score;
    });
    return next;
  });
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
          <h2 id="diagnostic-method-title">Elige la opción que más se parezca a tu situación real</h2>
          <p>Piensa en cómo trabajas hoy, no en lo que te gustaría hacer. Usa “No aplica” solo cuando esa actividad no forme parte de tu negocio; si podría ayudarte pero todavía no la haces, responde “No lo hacemos”.</p>
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
                const channelDetails = detailsByQuestion[question.id] ?? normalizeChannelAttributionDetails({});
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
                    {question.response_type === "channel_attribution" ? (
                      <ChannelAttributionQuestion
                        question={question}
                        details={channelDetails}
                        onChange={(details) => {
                          const score = scoreChannelAttribution(details);
                          setDetailsByQuestion((current) => ({ ...current, [question.id]: details }));
                          setAnswers((current) => {
                            const next = { ...current };
                            if (score === null) delete next[question.id];
                            else next[question.id] = score;
                            return next;
                          });
                        }}
                      />
                    ) : (
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
                            <span><b>{option.short}</b></span>
                          </label>
                        ))}
                      </div>
                    )}
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
