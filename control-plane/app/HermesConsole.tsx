"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Viewer = { email: string; name: string } | null;
type Job = {
  id: string;
  prompt: string;
  status: string;
  created_at: string;
};
type Status = {
  queued: number;
  running: number;
  completed: number;
  latestHeartbeat: string | null;
  observedAt: number;
};

const emptyStatus: Status = {
  queued: 0,
  running: 0,
  completed: 0,
  latestHeartbeat: null,
  observedAt: 0,
};

export function HermesConsole({ viewer }: { viewer: Viewer }) {
  const [prompt, setPrompt] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [status, setStatus] = useState<Status>(emptyStatus);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const statusResponse = await fetch("/api/status", { cache: "no-store" });
    if (statusResponse.ok) {
      const nextStatus = (await statusResponse.json()) as Omit<
        Status,
        "observedAt"
      >;
      setStatus({ ...nextStatus, observedAt: Date.now() });
    }

    if (viewer) {
      const jobsResponse = await fetch("/api/jobs", { cache: "no-store" });
      if (jobsResponse.ok) {
        const payload = (await jobsResponse.json()) as { jobs: Job[] };
        setJobs(payload.jobs);
      }
    }
  }, [viewer]);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      refresh().catch(() => setMessage("Status refresh failed."));
    }, 0);
    const timer = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 15000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [refresh]);

  async function enqueue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || !viewer) return;

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "enqueue", prompt: cleanPrompt }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to queue job.");
      setPrompt("");
      setMessage("Job saved. The hosted executor can claim it on its next wake-up.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to queue job.");
    } finally {
      setBusy(false);
    }
  }

  const heartbeatAge = status.latestHeartbeat
    ? status.observedAt - new Date(status.latestHeartbeat).getTime()
    : Number.POSITIVE_INFINITY;
  const online = heartbeatAge < 180000;

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">H</span>
          Hermes Hibernation Lab
        </div>
        <div className="identity">
          {viewer ? (
            <>
              <span>{viewer.name}</span>
              <a href="/signout-with-chatgpt?return_to=/">Sign out</a>
            </>
          ) : (
            <a href="/signin-with-chatgpt?return_to=/">Sign in with ChatGPT</a>
          )}
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">OpenAI-hosted persistence experiment</p>
          <h1>An agent that sleeps, but remembers.</h1>
        </div>
        <p className="hero-copy">
          Sites keeps the queue and encrypted state durable. Work supplies a fresh
          Hermes process when scheduled, then writes its checkpoint back before the
          sandbox disappears.
        </p>
      </section>

      <section className="grid">
        <article className="panel">
          <div className="panel-inner">
            <div className="panel-head">
              <h2>Research queue</h2>
              <span className={`status ${online ? "online" : ""}`}>
                <span className="dot" />
                {online ? "executor awake" : "executor sleeping"}
              </span>
            </div>

            <form className="queue-form" onSubmit={enqueue}>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={
                  viewer
                    ? "Describe the research job Hermes should pick up…"
                    : "Sign in with ChatGPT to add a research job."
                }
                disabled={!viewer || busy}
                maxLength={12000}
                aria-label="Research job prompt"
              />
              <button className="primary" type="submit" disabled={!viewer || busy || !prompt.trim()}>
                {busy ? "Saving…" : "Queue for Hermes"}
              </button>
              <p className={`hint ${message.includes("failed") || message.includes("Unable") ? "error" : ""}`}>
                {message ||
                  "Queue data survives Site deployments and Work sandbox replacement."}
              </p>
            </form>

            <div className="jobs">
              {viewer && jobs.length === 0 ? (
                <p className="hint">No jobs yet. The queue is ready.</p>
              ) : null}
              {jobs.slice(0, 8).map((job, index) => (
                <div className="job" key={job.id}>
                  <span className="job-index">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <p>{job.prompt}</p>
                    <small>{new Date(job.created_at).toLocaleString()}</small>
                  </div>
                  <span className="pill">{job.status}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <aside className="panel">
          <div className="panel-inner">
            <div className="panel-head">
              <h2>Control plane</h2>
              <span className="pill">prototype</span>
            </div>

            <div className="metrics">
              <div className="metric">
                <strong>{status.queued}</strong>
                <span>queued jobs</span>
              </div>
              <div className="metric">
                <strong>{status.completed}</strong>
                <span>completed jobs</span>
              </div>
            </div>

            <div className="flow">
              <div className="flow-step">
                <strong>Sites receives</strong>
                <span>D1 holds jobs and events; R2 holds encrypted Hermes snapshots.</span>
              </div>
              <div className="flow-step">
                <strong>Work wakes</strong>
                <span>A scheduled hosted run restores Hermes and imports Codex OAuth.</span>
              </div>
              <div className="flow-step">
                <strong>Hermes executes</strong>
                <span>The real Python agent handles one bounded research turn.</span>
              </div>
              <div className="flow-step">
                <strong>State returns</strong>
                <span>The encrypted checkpoint is stored before ephemeral compute ends.</span>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
