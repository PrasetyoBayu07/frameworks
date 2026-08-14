import React, { useState, useCallback } from 'react';
import './App.css';

// Import Lxrn library
const Lxrn = require('./index');

const App = () => {
  const [inputText, setInputText] = useState('');
  const [compressed, setCompressed] = useState(null);
  const [decompressed, setDecompressed] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('text'); // 'text' | 'file'
  const [compressionLevel, setCompressionLevel] = useState('fastest');

  const handleCompress = useCallback(() => {
    if (!inputText) {
      setError('Please enter some text to compress');
      return;
    }

    setLoading(true);
    setError(null);
    setStats(null);

    try {
      const data = Buffer.from(inputText, 'utf8');
      const level = Lxrn.CompressionLevel[compressionLevel.toUpperCase()];
      const startTime = performance.now();
      const compressed = Lxrn.compressData(data, level);
      const endTime = performance.now();

      setCompressed(compressed);
      setStats({
        originalSize: data.length,
        compressedSize: compressed.length,
        ratio: ((compressed.length / data.length) * 100).toFixed(1),
        time: (endTime - startTime).toFixed(2),
        level: compressionLevel
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [inputText, compressionLevel]);

  const handleDecompress = useCallback(() => {
    if (!compressed) {
      setError('No compressed data to decompress');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const startTime = performance.now();
      const decompressed = Lxrn.decompressData(compressed);
      const endTime = performance.now();

      setDecompressed(decompressed.toString('utf8'));
      setStats(prev => ({
        ...prev,
        decompressedSize: decompressed.length,
        decompressTime: (endTime - startTime).toFixed(2)
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [compressed]);

  const handleClear = useCallback(() => {
    setInputText('');
    setCompressed(null);
    setDecompressed('');
    setStats(null);
    setError(null);
  }, []);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = Buffer.from(e.target.result);
      setInputText(buffer.toString('utf8'));
      setMode('text');
    };
    reader.readAsArrayBuffer(file);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>📦 Lxrn Compression</h1>
        <p>Pure JavaScript LZ77 + Huffman Compression</p>
      </header>

      <main className="main">
        <div className="controls">
          <div className="control-group">
            <label>Compression Level:</label>
            <select 
              value={compressionLevel} 
              onChange={(e) => setCompressionLevel(e.target.value)}
            >
              <option value="minimal">Minimal (0)</option>
              <option value="fastest">Fastest (1)</option>
              <option value="automatic">Automatic (-1)</option>
              <option value="maximal">Maximal (9)</option>
            </select>
          </div>

          <div className="control-group">
            <label>Mode:</label>
            <button 
              className={mode === 'text' ? 'active' : ''}
              onClick={() => setMode('text')}
            >
              Text
            </button>
            <button 
              className={mode === 'file' ? 'active' : ''}
              onClick={() => setMode('file')}
            >
              File
            </button>
          </div>
        </div>

        <div className="input-section">
          {mode === 'text' ? (
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text to compress..."
              rows={6}
            />
          ) : (
            <div className="file-upload">
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".txt,.json,.csv,.log"
              />
              <p>or drag and drop a file here</p>
            </div>
          )}
        </div>

        <div className="actions">
          <button onClick={handleCompress} disabled={loading || !inputText}>
            {loading ? '⏳ Compressing...' : '🔒 Compress'}
          </button>
          <button 
            onClick={handleDecompress} 
            disabled={loading || !compressed}
          >
            {loading ? '⏳ Decompressing...' : '🔓 Decompress'}
          </button>
          <button onClick={handleClear} disabled={loading}>
            🗑️ Clear
          </button>
        </div>

        {error && (
          <div className="error">
            ❌ {error}
          </div>
        )}

        {stats && (
          <div className="stats">
            <h3>📊 Compression Statistics</h3>
            <div className="stat-grid">
              <div className="stat-item">
                <span className="stat-label">Original Size</span>
                <span className="stat-value">{stats.originalSize} bytes</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Compressed Size</span>
                <span className="stat-value">{stats.compressedSize} bytes</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Compression Ratio</span>
                <span className="stat-value">{stats.ratio}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Compression Time</span>
                <span className="stat-value">{stats.time} ms</span>
              </div>
              {stats.decompressedSize && (
                <>
                  <div className="stat-item">
                    <span className="stat-label">Decompressed Size</span>
                    <span className="stat-value">{stats.decompressedSize} bytes</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Decompress Time</span>
                    <span className="stat-value">{stats.decompressTime} ms</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {compressed && (
          <div className="output-section">
            <div className="output-header">
              <h3>📥 Compressed Data (Base64)</h3>
              <button onClick={() => {
                navigator.clipboard.writeText(compressed.toString('base64'));
                alert('Copied to clipboard!');
              }}>
                📋 Copy
              </button>
            </div>
            <pre className="compressed-output">
              {compressed.toString('base64').substring(0, 200)}...
            </pre>
          </div>
        )}

        {decompressed && (
          <div className="output-section">
            <h3>📤 Decompressed Data</h3>
            <pre className="decompressed-output">
              {decompressed}
            </pre>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>
          Built with ❤️ using LZ77 + Huffman Coding | 
          {stats && ` Compression Ratio: ${stats.ratio}%`}
        </p>
      </footer>
    </div>
  );
};

export default App;
