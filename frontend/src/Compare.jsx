import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Scatter } from 'react-chartjs-2';
import './compare.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Compare() {
  const [dataStatus, setDataStatus] = useState({ loaded: false, loading: false, msg: '', error: false });
  const [config, setConfig] = useState({ min_support: 0.02, min_confidence: 0.2, min_lift: 1.0 });
  const [analysisStatus, setAnalysisStatus] = useState({ loading: false, result: null, compResult: null, error: '' });
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLoadDefault = async () => {
    setDataStatus({ loaded: false, loading: true, msg: '', error: false });
    try {
      const res = await fetch('/load_default_dataset', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setDataStatus({ loaded: true, loading: false, msg: `Success: ${data.message} (${data.transactions_count} transactions)`, error: false });
      } else {
        throw new Error(data.detail || 'Failed to load dataset');
      }
    } catch (err) {
      setDataStatus({ loaded: false, loading: false, msg: err.message, error: true });
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setDataStatus({ loaded: false, loading: true, msg: '', error: false });
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setDataStatus({ loaded: true, loading: false, msg: `Success: ${data.message} (${data.transactions_count} transactions)`, error: false });
      } else {
        throw new Error(data.detail || 'Failed to upload dataset');
      }
    } catch (err) {
      setDataStatus({ loaded: false, loading: false, msg: err.message, error: true });
    }
  };

  const runAnalysis = async (endpoint) => {
    setAnalysisStatus({ loading: true, result: null, compResult: null, error: '' });
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Analysis failed');
      setAnalysisStatus({ loading: false, result: data, compResult: null, error: '' });
      setActiveTab('dashboard');
    } catch (err) {
      setAnalysisStatus({ loading: false, result: null, compResult: null, error: err.message });
    }
  };

  const runCompare = async () => {
    setAnalysisStatus({ loading: true, result: null, compResult: null, error: '' });
    try {
      const res = await fetch('/analyze/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Comparison failed');
      setAnalysisStatus({ loading: false, result: null, compResult: data.comparison, error: '' });
    } catch (err) {
      setAnalysisStatus({ loading: false, result: null, compResult: null, error: err.message });
    }
  };

  const getScatterData = () => {
    if (!analysisStatus.result || !analysisStatus.result.top_10_rules) return null;
    return {
      datasets: [{
        label: 'Rules',
        data: analysisStatus.result.top_10_rules.map(rule => ({
          x: rule.support,
          y: rule.confidence,
          r: rule.lift * 5,
          label: `${rule.antecedents.join('+')} -> ${rule.consequents.join('+')}`
        })),
        backgroundColor: 'rgba(139, 92, 246, 0.6)',
        borderColor: 'rgba(139, 92, 246, 1)',
      }]
    };
  };

  return (
    <div className="compare-container">
      <header className="glass-panel main-header">
        <div className="logo">
          <h1>Market Basket Analytics</h1>
          <p>Apriori vs Pattern Growth Algorithm</p>
        </div>
        <div className="status-indicator">
          {dataStatus.loaded ? (
            <span className="status-badge success">Dataset Loaded</span>
          ) : (
            <span className="status-badge warning">No Dataset Loaded</span>
          )}
        </div>
      </header>

      <main className="main-content">
        <aside className="controls-column">
          <section className="glass-panel control-section">
            <h2>1. Data Source</h2>
            <div className="button-group">
              <button onClick={handleLoadDefault} disabled={dataStatus.loading} className="btn primary">
                Load Default Dataset
              </button>
            </div>
            <div className="divider">OR</div>
            <div className="upload-group">
              <label className="file-upload-label">
                <span>Upload Custom CSV</span>
                <input type="file" accept=".csv" onChange={handleUpload} disabled={dataStatus.loading} style={{display: 'none'}} />
              </label>
            </div>
            {dataStatus.loading && <div className="spinner"></div>}
            {dataStatus.msg && (
              <p className={`msg ${dataStatus.error ? 'error' : 'success'}`}>{dataStatus.msg}</p>
            )}
          </section>

          <section className="glass-panel control-section">
            <h2>2. Configuration</h2>
            <div className="input-group">
              <label>Minimum Support</label>
              <input 
                type="number" 
                value={config.min_support} 
                step="0.01" min="0.01" max="1.0"
                onChange={e => setConfig({...config, min_support: parseFloat(e.target.value)})}
              />
            </div>
            <div className="input-group">
              <label>Minimum Confidence</label>
              <input 
                type="number" 
                value={config.min_confidence} 
                step="0.01" min="0.01" max="1.0"
                onChange={e => setConfig({...config, min_confidence: parseFloat(e.target.value)})}
              />
            </div>
            <div className="input-group">
              <label>Minimum Lift</label>
              <input 
                type="number" 
                value={config.min_lift} 
                step="0.1" min="0.1"
                onChange={e => setConfig({...config, min_lift: parseFloat(e.target.value)})}
              />
            </div>
          </section>

          <section className="glass-panel control-section">
            <h2>3. Run Analysis</h2>
            <div className="button-group-vertical">
              <button onClick={() => runAnalysis('/analyze/apriori')} disabled={!dataStatus.loaded || analysisStatus.loading} className="btn action">Run Apriori</button>
              <button onClick={() => runAnalysis('/analyze/fpgrowth')} disabled={!dataStatus.loaded || analysisStatus.loading} className="btn action">Run FP-Growth</button>
              <button onClick={runCompare} disabled={!dataStatus.loaded || analysisStatus.loading} className="btn highlight">Compare Algorithms</button>
            </div>
            {analysisStatus.loading && <div className="spinner"></div>}
            {analysisStatus.error && <p className="msg error">{analysisStatus.error}</p>}
          </section>
        </aside>

        <section className="results-column">
          {analysisStatus.compResult && (
            <div className="glass-panel result-panel">
              <h2>Performance Comparison</h2>
              <div className="metrics-grid">
                <div className="metric-box">
                  <h3>Apriori Time</h3>
                  <p>{analysisStatus.compResult.apriori_time_seconds.toFixed(4)}s</p>
                </div>
                <div className="metric-box">
                  <h3>FP-Growth Time</h3>
                  <p>{analysisStatus.compResult.fpgrowth_time_seconds.toFixed(4)}s</p>
                </div>
                <div className="metric-box highlight">
                  <h3>Winner</h3>
                  <p>{analysisStatus.compResult.faster_algorithm}</p>
                </div>
              </div>
            </div>
          )}

          {analysisStatus.result && (
            <div className="glass-panel result-panel dashboard-results">
              <h2>{analysisStatus.result.algorithm} Results</h2>
              
              <div className="metrics-grid">
                <div className="metric-box">
                  <h3>Execution Time</h3>
                  <p>{analysisStatus.result.execution_time_seconds.toFixed(4)}s</p>
                </div>
                <div className="metric-box">
                  <h3>Itemsets Found</h3>
                  <p>{analysisStatus.result.frequent_itemsets_count}</p>
                </div>
                <div className="metric-box">
                  <h3>Rules Generated</h3>
                  <p>{analysisStatus.result.rules_count}</p>
                </div>
              </div>

              {analysisStatus.result.top_10_rules.length > 0 && (
                <div className="chart-container" style={{ marginTop: '2rem', height: '300px' }}>
                  <h3>Rules Scatter Plot (Support vs Confidence)</h3>
                  <Scatter 
                    data={getScatterData()} 
                    options={{
                      maintainAspectRatio: false,
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: (ctx) => {
                              const rule = ctx.raw.label;
                              return `${rule} | Sup: ${ctx.raw.x.toFixed(3)} | Conf: ${ctx.raw.y.toFixed(3)} | Lift: ${(ctx.raw.r / 5).toFixed(2)}`;
                            }
                          }
                        }
                      },
                      scales: {
                        x: { title: { display: true, text: 'Support' } },
                        y: { title: { display: true, text: 'Confidence' } }
                      }
                    }} 
                  />
                </div>
              )}

              {analysisStatus.result.top_10_rules.length > 0 && (
                <div className="table-container" style={{ marginTop: '2rem' }}>
                  <h3>Top 10 Rules</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Antecedents</th>
                        <th>Consequents</th>
                        <th>Support</th>
                        <th>Confidence</th>
                        <th>Lift</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisStatus.result.top_10_rules.map((r, i) => (
                        <tr key={i}>
                          <td>{r.antecedents.join(', ')}</td>
                          <td>{r.consequents.join(', ')}</td>
                          <td>{r.support.toFixed(4)}</td>
                          <td>{r.confidence.toFixed(4)}</td>
                          <td>{r.lift.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
