export function MyView() {
  return (
    <div
      style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}
    >
      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>My Extension</h1>
        <p style={{ marginTop: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
          Edit src/browser/MyView.tsx to build your extension.
        </p>
      </div>
    </div>
  );
}
