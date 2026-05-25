import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
  <h2>Response from Localhost:8080</h2>
  {(() => {
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
      fetch('http://localhost:8080/')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json(); // Switch to res.text() if your backend returns plain text
        })
        .then(data => { setData(data); setLoading(false); })
        .catch(err => { setError(err.message); setLoading(false); });
    }, []);

    if (loading) return <p>Loading...</p>;
    if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
    
    return (
      <pre style={{ background: '#f4f4f4', padding: '15px', borderRadius: '5px' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  })()}
</div>
    </>
  )
}

export default App
