import { useState, useEffect } from 'react';

function App() {
  const [backendStatus, setBackendStatus] = useState(null);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); 
  const [percent, setPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const [videoData, setVideoData] = useState(null); 

  useEffect(() => {
    fetch('http://127.0.0.1:8000/')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => setBackendStatus({ success: true, data }))
      .catch((err) => setBackendStatus({ success: false, error: err.message }));
  }, []);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    setStatus('processing');
    setPercent(0);
    setErrorMessage(null);
    setVideoData(null);

    const form = new FormData();
    form.append("video", file);

    fetch("http://127.0.0.1:8000/track", {
      method: "POST",
      body: form,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Upload initiation failed: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const pollInterval = setInterval(() => {
          fetch("http://127.0.0.1:8000/track")
            .then((res) => res.json())
            .then((job) => {
              if (job.status === 'processing') {
                setPercent(job.percent || 0);
              } else if (job.status === 'done') {
                clearInterval(pollInterval);
                setPercent(100);
                setStatus('done');
                setVideoData(job.result); 
              } else if (job.status === 'error') {
                clearInterval(pollInterval);
                setStatus('error');
                setErrorMessage(job.message || "An error occurred on the backend worker loop.");
              }
            })
            .catch((err) => {
              clearInterval(pollInterval);
              setStatus('error');
              setErrorMessage("Failed to read progress updates: " + err.message);
            });
        }, 1000);
      })
      .catch((err) => {
        setErrorMessage(err.message);
        setStatus('error');
      });
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Salamander Video Tracker</h1>
      <hr />

      {/* --- Part 1: Backend Connection Status Banner --- */}
      <section style={{ marginBottom: '30px' }}>
        {backendStatus === null && <p>Checking backend connection...</p>}
        {backendStatus?.success === false && (
          <p style={{ color: 'red' }}>⚠️ Cannot reach backend at port 8000. Is it running?</p>
        )}
        {backendStatus?.success === true && (
          <p style={{ color: 'green' }}>✅ Connected to backend successfully.</p>
        )}
      </section>

      {/* --- Part 2: File Upload Form & Progress Bar --- */}
      <section style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h3>Upload Video for Tracking</h3>
        <form onSubmit={handleFormSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="video-upload" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Choose a video file:
            </label>
            <input 
              id="video-upload"
              type="file" 
              accept="video/*"
              disabled={status === 'processing'}
              onChange={(e) => setFile(e.target.files[0])} 
            />
          </div>

          <button 
            type="submit" 
            disabled={status === 'processing' || !file}
            style={{
              background: '#0070f3',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: file && status !== 'processing' ? 'pointer' : 'not-allowed',
              opacity: file && status !== 'processing' ? 1 : 0.6
            }}
          >
            {status === 'processing' ? 'Processing...' : 'Upload Video'}
          </button>
        </form>

        {status === 'processing' && (
          <div style={{ marginTop: '20px', padding: '15px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            <p style={{ margin: '0 0 10px 0' }}>
              ⏳ Processing frames: <strong>{percent}%</strong>
            </p>
            <progress value={percent} max={100} style={{ width: '100%', height: '20px', accentColor: '#0070f3' }} />
          </div>
        )}

        {status === 'error' && (
          <p style={{ color: 'red', marginTop: '10px', fontWeight: 'bold' }}>❌ Error: {errorMessage}</p>
        )}
      </section>

      {/* --- Part 3: Video Result & Two-Column Metrics Section --- */}
      {status === 'done' && videoData?.video_url && (
        <section style={{ background: '#f4f4f4', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ color: 'green', marginTop: 0 }}>Processed Video Result</h3>
          
          <div style={{ marginBottom: '25px' }}>
            <video 
              key={videoData.video_url}
              src={videoData.video_url} 
              controls 
              style={{ width: '100%', maxHeight: '450px', background: '#000', borderRadius: '4px' }}
            />
          </div>

          {/* Metrics Layout grid splits tables side-by-side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
            
            {/* Table Column A: Time-on-screen Track Metrics */}
            <div>
              <h4 style={{ margin: '0 0 10px 0' }}>📊 Individual Visual Durations</h4>
              {videoData.tracks && videoData.tracks.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '6px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ background: '#eaeaea', textAlign: 'left' }}>
                      <th style={{ padding: '10px' }}>ID</th>
                      <th style={{ padding: '10px' }}>Label</th>
                      <th style={{ padding: '10px' }}>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videoData.tracks.map((track) => (
                      <tr key={track.track_id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px', fontWeight: 'bold' }}>{track.track_id}</td>
                        <td style={{ padding: '10px' }}>{track.label}</td>
                        <td style={{ padding: '10px' }}>{track.time_on_screen_s}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p style={{ fontStyle: 'italic', color: '#666' }}>No objects tracking.</p>}
            </div>

            {/* Table Column B: New Custom Metric - Center Point Log */}
            <div>
              <h4 style={{ margin: '0 0 10px 0' }}>📍 Focal Specimen Trajectory (1s intervals)</h4>
              {videoData.trajectory && videoData.trajectory.length > 0 ? (
                <div style={{ maxHeight: '200px', overflowY: 'auto', background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#eaeaea' }}>
                      <tr style={{ textAlign: 'left' }}>
                        <th style={{ padding: '10px' }}>Timestamp</th>
                        <th style={{ padding: '10px' }}>Center X</th>
                        <th style={{ padding: '10px' }}>Center Y</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videoData.trajectory.map((point, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '10px', color: '#4a5568' }}>{point.time_s}s</td>
                          <td style={{ padding: '10px', fontWeight: '500' }}>{point.x}px</td>
                          <td style={{ padding: '10px', fontWeight: '500' }}>{point.y}px</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p style={{ fontStyle: 'italic', color: '#666' }}>No trajectory points recorded.</p>}
            </div>

          </div>
        </section>
      )}
    </div>
  );
}

export default App;