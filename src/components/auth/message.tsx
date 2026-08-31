export function AuthMessage({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return <p role="status" className={`form-message ${error ? "error" : "success"}`}>{error ?? success}</p>;
}
