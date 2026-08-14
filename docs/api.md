# Lxrn Compression Library - Enterprise API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Installation](#installation)
3. [Core Library API](#core-library-api)
4. [Streaming API](#streaming-api)
5. [REST API Endpoints](#rest-api-endpoints)
6. [CLI Usage](#cli-usage)
7. [Error Handling](#error-handling)
8. [Configuration](#configuration)

---

## Overview

**Lxrn** is a pure JavaScript compression library implementing LZ77 and Huffman coding algorithms, fully compatible with the RFC 1952 (Gzip) specification.

---

## Installation

```bash
npm install
```

---

## Core Library API

### `compressData(data, [level])`
Compresses input buffer using LZ77 and Huffman encoding.

- **Parameters:**
  - `data` (`Buffer` | `Uint8Array`): Uncompressed raw data.
  - `level` (`CompressionLevel`, optional): Target compression level.
- **Returns:** `Buffer` / `Uint8Array` containing Gzip-compatible byte stream.

```javascript
const { compressData, CompressionLevel } = require('lxrn');

const input = Buffer.from('Enterprise payload content');
const compressed = compressData(input, CompressionLevel.MAXIMAL);
```

### `decompressData(data)`
Decompresses Gzip / Lxrn encoded byte buffer.

- **Parameters:**
  - `data` (`Buffer` | `Uint8Array`): Compressed byte stream.
- **Returns:** `Buffer` / `Uint8Array` containing original raw data.

```javascript
const { decompressData } = require('lxrn');

const decompressed = decompressData(compressed);
console.log(decompressed.toString());
```

---

## Streaming API

```javascript
const fs = require('fs');
const { CompressStream, DecompressStream } = require('lxrn/streams');

// Compress stream
fs.createReadStream('input.txt')
  .pipe(new CompressStream())
  .pipe(fs.createWriteStream('input.txt.lxrn'));

// Decompress stream
fs.createReadStream('input.txt.lxrn')
  .pipe(new DecompressStream())
  .pipe(fs.createWriteStream('output.txt'));
```

---

## REST API Endpoints

### `POST /compress`
- **Request Body:** Binary raw data or text payload.
- **Headers:** `Content-Type: application/octet-stream` (optional `X-Compression-Level: fastest|maximal|automatic`)
- **Response:** Compressed binary stream + metadata headers (`X-Original-Size`, `X-Compressed-Size`).

### `POST /compress-text`
- **Request Body:** JSON `{ "text": "...", "level": "automatic" }`
- **Response:** JSON `{ "success": true, "originalSize": 12, "compressedSize": 32, "compressedBase64": "..." }`

### `POST /decompress`
- **Request Body:** Compressed binary stream.
- **Response:** Uncompressed raw data.

### `GET /health`
- **Response:** System status and uptime metrics.

### `GET /metrics`
- **Response:** Compression & decompression performance counters and system metrics.

---

## CLI Usage

```bash
# Compress a file
lxrn compress document.txt document.txt.lxrn --level maximal

# Decompress a file
lxrn decompress document.txt.lxrn document.txt

# Inspect file
lxrn info document.txt.lxrn
```
