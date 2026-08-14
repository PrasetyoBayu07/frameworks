import React, { useState, useCallback, useRef } from 'react';
import { 
  compressData, 
  decompressData, 
  CompressionLevel, 
  LxrnError, 
  hasLxrnHeader 
} from './lxrn';

interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  ratio: string;
  time: string;
  level: string;
  decompressedSize?: number;
  decompressTime?: string;
  spaceSaved?: string;
}

export default function App() {
  const [inputText, setInputText] = useState<string>('Hello, World! This is a test of the Lxrn compression library with LZ77 and Huffman coding.');
  const [compressed, setCompressed] = useState<Uint8Array | null>(null);
  const [decompressed, setDecompressed] = useState<string>('');
  const [stats, setStats] = useState<CompressionStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [mode, setMode] = useState<'text' | 'file'>('text');
  const [compressionLevel, setCompressionLevel] = useState<string>('fastest');
  const [fileName, setFileName] = useState<string>('');
  const [viewMode, setViewMode] = useState<'base64' | 'hex'>('base64');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert Uint8Array to base64
  const uint8ToBase64 = useCallback((bytes: Uint8Array): string => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }, []);

  // Convert Uint8Array to Hex string representation
  const uint8ToHex = useCallback((bytes: Uint8Array, maxBytes = 128): string => {
    const slice = bytes.slice(0, maxBytes);
    let hex = '';
    for (let i = 0; i < slice.length; i++) {
      hex += slice[i].toString(16).padStart(2, '0').toUpperCase() + ' ';
      if ((i + 1) % 16 === 0) hex += '\n';
      else if ((i + 1) % 8 === 0) hex += '  ';
    }
    if (bytes.length > maxBytes) {
      hex += `\n... (${bytes.length - maxBytes} more bytes)`;
    }
    return hex;
  }, []);

  const handleCompress = useCallback(() => {
    if (!inputText && mode === 'text') {
      setError('Please enter some text to compress');
      return;
    }

    setLoading(true);
    setError(null);
    setStats(null);
    setDecompressed('');

    try {
      const data = new TextEncoder().encode(inputText);
      const levelMap: Record<string, CompressionLevel> = {
        minimal: CompressionLevel.MINIMAL,
        fastest: CompressionLevel.FASTEST,
        maximal: CompressionLevel.MAXIMAL,
        automatic: CompressionLevel.AUTOMATIC
      };
      const level = levelMap[compressionLevel] || CompressionLevel.AUTOMATIC;
      
      const startTime = performance.now();
      const compressedData = compressData(data, level);
      const endTime = performance.now();

      const origSize = data.length;
      const compSize = compressedData.length;
      const ratioNum = origSize > 0 ? (compSize / origSize) * 100 : 0;
      const spaceSavedNum = origSize > compSize ? (((origSize - compSize) / origSize) * 100).toFixed(1) : '0';

      setCompressed(compressedData);
      setStats({
        originalSize: origSize,
        compressedSize: compSize,
        ratio: ratioNum.toFixed(1),
        spaceSaved: spaceSavedNum,
        time: (endTime - startTime).toFixed(2),
        level: compressionLevel
      });
    } catch (err: any) {
      setError(err?.details || err?.message || 'Compression failed');
    } finally {
      setLoading(false);
    }
  }, [inputText, mode, compressionLevel]);

  const handleDecompress = useCallback(() => {
    if (!compressed) {
      setError('No compressed data to decompress');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const startTime = performance.now();
      const decompressedBytes = decompressData(compressed);
      const endTime = performance.now();

      const decodedText = new TextDecoder().decode(decompressedBytes);
      setDecompressed(decodedText);
      setStats(prev => prev ? ({
        ...prev,
        decompressedSize: decompressedBytes.length,
        decompressTime: (endTime - startTime).toFixed(2)
      }) : null);
    } catch (err: any) {
      setError(err?.details || err?.message || 'Decompression failed: Invalid or corrupted format');
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
    setFileName('');
  }, []);

  const handleFileProcess = useCallback((file: File) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const text = new TextDecoder().decode(new Uint8Array(e.target.result as ArrayBuffer));
        setInputText(text);
        setMode('text');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFileProcess(file);
  }, [handleFileProcess]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  }, [handleFileProcess]);

  const handleCopy = useCallback(() => {
    if (!compressed) return;
    const b64 = uint8ToBase64(compressed);
    navigator.clipboard.writeText(b64).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = b64;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [compressed, uint8ToBase64]);

  const handleDownloadCompressed = useCallback(() => {
    if (!compressed) return;
    const blob = new Blob([compressed], { type: 'application/gzip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (fileName ? fileName.replace(/\.[^/.]+$/, '') : 'data') + '.lxrn.gz';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [compressed, fileName]);

  const handleDownloadDecompressed = useCallback(() => {
    if (!decompressed) return;
    const blob = new Blob([decompressed], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (fileName ? 'decompressed_' + fileName : 'decompressed_output.txt');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [decompressed, fileName]);

  const loadSample = useCallback((type: 'short' | 'long' | 'repetitive' | 'random') => {
    const samples = {
      short: 'Hello, World! This is a test of the Lxrn compression library with LZ77 and Huffman coding.',
      long: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      repetitive: 'aaaaabbbbbcccccdddddeeeeefffffggggghhhhhiiiiijjjjjkkkkklllllmmmmmnnnnnoooo'.repeat(3),
      random: Array.from({ length: 120 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('')
    };
    setInputText(samples[type]);
    setFileName('');
    setCompressed(null);
    setDecompressed('');
    setStats(null);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0] font-sans antialiased selection:bg-[#00b4d8]/30 selection:text-white">
      <div className="max-w-[1100px] mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Header Banner */}
        <header id="appHeader" className="text-center py-8 px-6 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl mb-6 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#00b4d8]/10 rounded-full blur-3xl pointer-events-none" />
          <h1 id="appTitle" className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-[#00b4d8] to-[#0077b6] bg-clip-text text-transparent mb-2 tracking-tight">
            📦 Lxrn Compression
          </h1>
          <p className="text-[#8892b0] text-sm sm:text-base max-w-xl mx-auto">
            Pure JavaScript LZ77 + Huffman Gzip-compatible Compression Engine
          </p>
        </header>

        {/* Main Controls Card */}
        <main className="space-y-6">
          <div id="controlsCard" className="bg-[#1a1a2e] p-5 sm:p-6 rounded-xl border border-white/5 shadow-lg space-y-5">
            
            {/* Top Toolbar: Levels, Mode & Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="compressionLevelSelect" className="text-[#8892b0] text-xs font-semibold uppercase tracking-wider">
                    Level:
                  </label>
                  <select 
                    id="compressionLevelSelect"
                    value={compressionLevel} 
                    onChange={(e) => setCompressionLevel(e.target.value)}
                    className="bg-[#2a2a4a] text-[#e0e0e0] border border-white/10 px-3 py-1.5 rounded-lg text-sm cursor-pointer hover:border-[#00b4d8] focus:outline-none focus:border-[#00b4d8] transition-colors"
                  >
                    <option value="minimal">Minimal (0)</option>
                    <option value="fastest">Fastest (1)</option>
                    <option value="automatic">Automatic (-1)</option>
                    <option value="maximal">Maximal (9)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-[#2a2a4a] p-1 rounded-lg border border-white/10">
                  <button 
                    id="textModeBtn"
                    type="button"
                    className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                      mode === 'text' 
                        ? 'bg-[#00b4d8] text-white shadow' 
                        : 'text-[#8892b0] hover:text-white'
                    }`}
                    onClick={() => setMode('text')}
                  >
                    Text
                  </button>
                  <button 
                    id="fileModeBtn"
                    type="button"
                    className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                      mode === 'file' 
                        ? 'bg-[#00b4d8] text-white shadow' 
                        : 'text-[#8892b0] hover:text-white'
                    }`}
                    onClick={() => setMode('file')}
                  >
                    File
                  </button>
                </div>
              </div>

              {/* Sample presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[#8892b0] text-xs mr-1 hidden sm:inline">Presets:</span>
                <button 
                  id="sampleShortBtn"
                  onClick={() => loadSample('short')}
                  className="px-2.5 py-1 text-xs bg-[#2a2a4a] hover:bg-[#3a3a5a] text-[#8892b0] hover:text-white rounded border border-white/5 transition-all"
                >
                  📝 Short
                </button>
                <button 
                  id="sampleLongBtn"
                  onClick={() => loadSample('long')}
                  className="px-2.5 py-1 text-xs bg-[#2a2a4a] hover:bg-[#3a3a5a] text-[#8892b0] hover:text-white rounded border border-white/5 transition-all"
                >
                  📄 Long
                </button>
                <button 
                  id="sampleRepetitiveBtn"
                  onClick={() => loadSample('repetitive')}
                  className="px-2.5 py-1 text-xs bg-[#2a2a4a] hover:bg-[#3a3a5a] text-[#8892b0] hover:text-white rounded border border-white/5 transition-all"
                >
                  🔄 Repetitive
                </button>
                <button 
                  id="sampleRandomBtn"
                  onClick={() => loadSample('random')}
                  className="px-2.5 py-1 text-xs bg-[#2a2a4a] hover:bg-[#3a3a5a] text-[#8892b0] hover:text-white rounded border border-white/5 transition-all"
                >
                  🎲 Random
                </button>
              </div>
            </div>

            {/* Input Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#8892b0] uppercase tracking-wider">
                  {mode === 'text' ? 'Source Content' : 'File Input'}
                </label>
                {fileName && (
                  <span className="text-xs text-[#00b4d8] font-mono">
                    Loaded: {fileName}
                  </span>
                )}
              </div>

              {mode === 'text' ? (
                <textarea
                  id="inputText"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter text to compress..."
                  rows={6}
                  className="w-full p-4 bg-[#0a0a1a] border border-white/10 rounded-xl text-[#e0e0e0] font-mono text-sm resize-y focus:outline-none focus:border-[#00b4d8] focus:ring-1 focus:ring-[#00b4d8] transition-all"
                />
              ) : (
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-10 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                    isDragging 
                      ? 'border-[#00b4d8] bg-[#00b4d8]/10' 
                      : 'border-white/15 bg-[#0a0a1a] hover:border-[#00b4d8] hover:bg-[#1a1a3e]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    accept=".txt,.json,.csv,.log,.xml,.html,.css,.js"
                    className="hidden"
                  />
                  <div className="text-3xl mb-2">📁</div>
                  <p className="text-sm font-medium text-white mb-1">
                    {fileName ? `Selected: ${fileName}` : 'Click to choose file or drag and drop'}
                  </p>
                  <p className="text-xs text-[#8892b0]">
                    Supports .txt, .json, .csv, .log, .js, .xml
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button 
                id="compressActionBtn"
                onClick={handleCompress} 
                disabled={loading || (!inputText && mode === 'text')}
                className="px-6 py-3 bg-gradient-to-r from-[#00b4d8] to-[#0077b6] hover:from-[#00c2e8] hover:to-[#0088cc] text-white font-semibold text-sm rounded-lg shadow-lg hover:shadow-[#00b4d8]/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2 cursor-pointer"
              >
                {loading ? '⏳ Compressing...' : '🔒 Compress'}
              </button>

              <button 
                id="decompressActionBtn"
                onClick={handleDecompress} 
                disabled={loading || !compressed}
                className="px-6 py-3 bg-gradient-to-r from-[#f72585] to-[#b5179e] hover:from-[#f94095] hover:to-[#c71aa8] text-white font-semibold text-sm rounded-lg shadow-lg hover:shadow-[#f72585]/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2 cursor-pointer"
              >
                {loading ? '⏳ Decompressing...' : '🔓 Decompress'}
              </button>

              <button 
                id="clearActionBtn"
                onClick={handleClear} 
                disabled={loading}
                className="px-5 py-3 bg-[#2a2a4a] hover:bg-[#3a3a5a] text-[#8892b0] hover:text-white font-semibold text-sm rounded-lg border border-white/5 transition-all cursor-pointer"
              >
                🗑️ Clear All
              </button>
            </div>
          </div>

          {/* Loading Progress Bar */}
          {loading && (
            <div className="h-1.5 w-full bg-[#2a2a4a] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#00b4d8] via-[#f72585] to-[#00b4d8] animate-pulse w-full" />
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div id="errorBanner" className="bg-[#f72585]/10 border border-[#f72585] text-[#f72585] p-4 rounded-xl text-sm flex items-start gap-3">
              <span className="text-lg">❌</span>
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Stats Grid */}
          {stats && (
            <div id="statsSection" className="bg-[#1a1a2e] rounded-xl p-5 border border-white/5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#00b4d8] uppercase tracking-wider flex items-center gap-2">
                  📊 Compression Statistics
                </h3>
                <span className="text-xs bg-[#00c853]/20 text-[#00c853] px-2.5 py-1 rounded-full font-semibold">
                  Saved: {stats.spaceSaved}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/[0.03] p-3.5 rounded-lg border border-white/5">
                  <div className="text-[#8892b0] text-xs uppercase tracking-wider mb-1">Original Size</div>
                  <div className="text-white text-lg font-bold font-mono">{stats.originalSize} bytes</div>
                </div>

                <div className="bg-white/[0.03] p-3.5 rounded-lg border border-white/5">
                  <div className="text-[#8892b0] text-xs uppercase tracking-wider mb-1">Compressed Size</div>
                  <div className="text-[#00b4d8] text-lg font-bold font-mono">{stats.compressedSize} bytes</div>
                </div>

                <div className="bg-white/[0.03] p-3.5 rounded-lg border border-white/5">
                  <div className="text-[#8892b0] text-xs uppercase tracking-wider mb-1">Compression Ratio</div>
                  <div className="text-white text-lg font-bold font-mono">{stats.ratio}%</div>
                </div>

                <div className="bg-white/[0.03] p-3.5 rounded-lg border border-white/5">
                  <div className="text-[#8892b0] text-xs uppercase tracking-wider mb-1">Compress Time</div>
                  <div className="text-white text-lg font-bold font-mono">{stats.time} ms</div>
                </div>

                {stats.decompressedSize !== undefined && (
                  <>
                    <div className="bg-white/[0.03] p-3.5 rounded-lg border border-white/5">
                      <div className="text-[#8892b0] text-xs uppercase tracking-wider mb-1">Decompressed Size</div>
                      <div className="text-white text-lg font-bold font-mono">{stats.decompressedSize} bytes</div>
                    </div>
                    <div className="bg-white/[0.03] p-3.5 rounded-lg border border-white/5">
                      <div className="text-[#8892b0] text-xs uppercase tracking-wider mb-1">Decompress Time</div>
                      <div className="text-white text-lg font-bold font-mono">{stats.decompressTime} ms</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Compressed Data Output */}
          {compressed && (
            <div id="compressedSection" className="bg-[#1a1a2e] rounded-xl p-5 border border-white/5 shadow-lg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-[#00b4d8] uppercase tracking-wider">
                    📥 Compressed Output ({compressed.length} bytes)
                  </h3>
                  <div className="flex items-center gap-1 bg-[#0a0a1a] p-0.5 rounded border border-white/10">
                    <button
                      onClick={() => setViewMode('base64')}
                      className={`px-2 py-0.5 text-xs rounded transition-colors ${
                        viewMode === 'base64' ? 'bg-[#00b4d8] text-white' : 'text-[#8892b0]'
                      }`}
                    >
                      Base64
                    </button>
                    <button
                      onClick={() => setViewMode('hex')}
                      className={`px-2 py-0.5 text-xs rounded transition-colors ${
                        viewMode === 'hex' ? 'bg-[#00b4d8] text-white' : 'text-[#8892b0]'
                      }`}
                    >
                      Hex
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    id="copyCompressedBtn"
                    onClick={handleCopy}
                    className="px-3 py-1.5 bg-[#2a2a4a] hover:bg-[#3a3a5a] text-[#8892b0] hover:text-white rounded-lg text-xs font-semibold border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? '✅ Copied!' : '📋 Copy Base64'}
                  </button>
                  <button 
                    id="downloadCompressedBtn"
                    onClick={handleDownloadCompressed}
                    className="px-3 py-1.5 bg-[#2a2a4a] hover:bg-[#3a3a5a] text-[#8892b0] hover:text-white rounded-lg text-xs font-semibold border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    💾 Download .gz
                  </button>
                </div>
              </div>

              <pre className="bg-[#0a0a1a] p-4 rounded-lg font-mono text-xs text-[#e0e0e0] overflow-x-auto max-h-56 leading-relaxed border border-white/5 break-all whitespace-pre-wrap">
                {viewMode === 'base64' ? uint8ToBase64(compressed) : uint8ToHex(compressed)}
              </pre>
            </div>
          )}

          {/* Decompressed Data Output */}
          {decompressed && (
            <div id="decompressedSection" className="bg-[#1a1a2e] rounded-xl p-5 border border-white/5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#00c853] uppercase tracking-wider">
                  📤 Decompressed Data
                </h3>
                <button 
                  id="downloadDecompressedBtn"
                  onClick={handleDownloadDecompressed}
                  className="px-3 py-1.5 bg-[#2a2a4a] hover:bg-[#3a3a5a] text-[#8892b0] hover:text-white rounded-lg text-xs font-semibold border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
                >
                  💾 Download Text
                </button>
              </div>

              <pre className="bg-[#0a0a1a] p-4 rounded-lg font-mono text-xs text-[#e0e0e0] overflow-x-auto max-h-56 leading-relaxed border border-white/5 whitespace-pre-wrap">
                {decompressed}
              </pre>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="text-center py-8 text-xs text-[#8892b0] border-t border-white/5 mt-10 space-y-1">
          <p>
            Built with ❤️ using LZ77 + Huffman Coding
            {stats && ` • Current Compression Ratio: ${stats.ratio}%`}
          </p>
          <p className="text-white/30">
            Lxrn Compression Library Visual Suite
          </p>
        </footer>
      </div>
    </div>
  );
}
