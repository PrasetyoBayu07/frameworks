import React, { useState } from 'react';
import { Lxrn, compressData, decompressData, LxrnError } from './lxrn';

export default function App() {
  const [inputText, setInputText] = useState('Hello, World! This is a test of the Lxrn compression library.');
  const [compressedText, setCompressedText] = useState('');
  const [decompressedText, setDecompressedText] = useState('');
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [ratio, setRatio] = useState('0%');
  const [status, setStatus] = useState('Ready');
  const [statusColor, setStatusColor] = useState('#666');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [engineMode, setEngineMode] = useState<'lxrn' | 'simulated'>('lxrn');

  // Convert Uint8Array to base64
  const uint8ToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Convert base64 to Uint8Array
  const base64ToUint8 = (base64: string): Uint8Array => {
    const binary = window.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  const handleCompress = () => {
    const input = inputText;
    const inputBytes = new TextEncoder().encode(input);
    
    try {
      let b64Result = '';
      let compBytesLen = 0;

      if (engineMode === 'lxrn') {
        // Actual Lxrn compression library
        const compressed = compressData(inputBytes);
        b64Result = uint8ToBase64(compressed);
        compBytesLen = compressed.length;
      } else {
        // Simulated compression for demo (shows base64 encoding)
        b64Result = btoa(input);
        compBytesLen = b64Result.length;
      }
      
      setCompressedText(b64Result);
      setOriginalSize(inputBytes.length);
      setCompressedSize(compBytesLen);
      const calcRatio = inputBytes.length > 0 
        ? ((compBytesLen / inputBytes.length) * 100).toFixed(1) + '%'
        : '0%';
      setRatio(calcRatio);
      setStatus('Compressed');
      setStatusColor('#4CAF50');
      setSuccessMsg(`Compression successful! (${engineMode === 'lxrn' ? 'Pure LZ77 + Huffman Gzip' : 'Base64 Simulation'})`);
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg('Error: ' + (err?.details || err?.message || 'Compression failed'));
      setSuccessMsg('');
    }
  };

  const handleDecompress = () => {
    const compressed = compressedText;
    if (!compressed) {
      setErrorMsg('Error: No compressed data to decompress.');
      setSuccessMsg('');
      return;
    }
    
    try {
      let decodedStr = '';

      if (engineMode === 'lxrn') {
        // Actual Lxrn decompression
        const rawBytes = base64ToUint8(compressed);
        const decompressed = decompressData(rawBytes);
        decodedStr = new TextDecoder().decode(decompressed);
      } else {
        // Simulated decompression for demo
        decodedStr = atob(compressed);
      }
      
      setDecompressedText(decodedStr);
      setStatus('Decompressed');
      setStatusColor('#4CAF50');
      setSuccessMsg('Decompression successful!');
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg('Error: ' + (err?.details || err?.message || 'Decompression failed'));
      setSuccessMsg('');
    }
  };

  const handleClearAll = () => {
    setInputText('');
    setCompressedText('');
    setDecompressedText('');
    setOriginalSize(0);
    setCompressedSize(0);
    setRatio('0%');
    setStatus('Ready');
    setStatusColor('#666');
    setErrorMsg('');
    setSuccessMsg('');
  };

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      background: '#f5f5f5',
      minHeight: '100vh',
      boxSizing: 'border-box'
    }}>
      <div className="container" id="mainContainer" style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 id="mainTitle" style={{
          color: '#333',
          borderBottom: '2px solid #4CAF50',
          paddingBottom: '10px',
          margin: '0 0 15px 0'
        }}>Lxrn Compression Library Demo</h1>
        
        {/* Mode switch bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px', fontSize: '14px', color: '#555' }}>
          <span><strong>Engine Mode:</strong></span>
          <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input 
              type="radio" 
              name="engineMode" 
              value="lxrn" 
              checked={engineMode === 'lxrn'} 
              onChange={() => setEngineMode('lxrn')} 
            />
            Pure Lxrn (LZ77 + Huffman Gzip)
          </label>
          <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input 
              type="radio" 
              name="engineMode" 
              value="simulated" 
              checked={engineMode === 'simulated'} 
              onChange={() => setEngineMode('simulated')} 
            />
            Simulated Demo (Base64)
          </label>
        </div>

        <div className="controls" id="controlsSection" style={{ margin: '15px 0' }}>
          <button 
            id="compressBtn"
            onClick={handleCompress}
            style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              margin: '5px',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Compress
          </button>
          <button 
            id="decompressBtn"
            onClick={handleDecompress}
            style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              margin: '5px',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Decompress
          </button>
          <button 
            id="clearBtn"
            onClick={handleClearAll}
            style={{
              background: '#757575',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              margin: '5px',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Clear All
          </button>
        </div>
        
        <label htmlFor="inputText" style={{ display: 'block', fontWeight: 600, color: '#444', marginTop: '10px' }}>
          Input Text:
        </label>
        <textarea 
          id="inputText" 
          placeholder="Type or paste text to compress..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          style={{
            width: '100%',
            height: '130px',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontFamily: 'monospace',
            margin: '5px 0 15px 0',
            boxSizing: 'border-box',
            fontSize: '13px'
          }}
        />
        
        <label htmlFor="compressedText" style={{ display: 'block', fontWeight: 600, color: '#444' }}>
          Compressed (Base64):
        </label>
        <textarea 
          id="compressedText" 
          placeholder="Compressed data will appear here..." 
          value={compressedText}
          onChange={(e) => setCompressedText(e.target.value)}
          style={{
            width: '100%',
            height: '110px',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontFamily: 'monospace',
            margin: '5px 0 15px 0',
            boxSizing: 'border-box',
            fontSize: '13px'
          }}
        />
        
        <label htmlFor="decompressedText" style={{ display: 'block', fontWeight: 600, color: '#444' }}>
          Decompressed:
        </label>
        <textarea 
          id="decompressedText" 
          placeholder="Decompressed data will appear here..." 
          value={decompressedText}
          readOnly
          style={{
            width: '100%',
            height: '110px',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontFamily: 'monospace',
            margin: '5px 0 15px 0',
            boxSizing: 'border-box',
            fontSize: '13px',
            backgroundColor: '#fafafa'
          }}
        />
        
        <div id="stats" className="stats" style={{
          background: '#f0f0f0',
          padding: '12px 16px',
          borderRadius: '4px',
          margin: '15px 0',
          fontFamily: 'monospace',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px'
        }}>
          <div>Original: <span id="originalSize" style={{ fontWeight: 'bold', color: '#4CAF50' }}>{originalSize}</span> bytes</div>
          <div>Compressed: <span id="compressedSize" style={{ fontWeight: 'bold', color: '#4CAF50' }}>{compressedSize}</span> bytes</div>
          <div>Ratio: <span id="ratio" style={{ fontWeight: 'bold', color: '#4CAF50' }}>{ratio}</span></div>
          <div>Status: <span id="status" style={{ fontWeight: 'bold', color: statusColor }}>{status}</span></div>
        </div>
        
        {errorMsg && (
          <div id="error" className="error" style={{
            color: '#d32f2f',
            background: '#ffebee',
            padding: '10px 14px',
            borderRadius: '4px',
            margin: '10px 0',
            fontSize: '14px'
          }}>
            {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div id="success" className="success" style={{
            color: '#2e7d32',
            background: '#e8f5e9',
            padding: '10px 14px',
            borderRadius: '4px',
            margin: '10px 0',
            fontSize: '14px'
          }}>
            {successMsg}
          </div>
        )}
      </div>
    </div>
  );
}
