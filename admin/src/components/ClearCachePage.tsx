export default function ClearCachePage() {
  return (
    <div className="clear-cache-page">
      <div className="admin-breadcrumbs">Home / Clear Cache</div>

      <div className="cache-visual">
        <div className="cache-bolt">⚡</div>
        <h1>WOW! Cache Cleared!!</h1>
        <p>System cache has been invalidated successfully. Redis and server-side cache entries have been refreshed.</p>
        <button type="button" className="clear-cache-btn">Clear Cache</button>
      </div>
    </div>
  );
}
