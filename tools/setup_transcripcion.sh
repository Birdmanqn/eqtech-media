#!/usr/bin/env bash
# Instala el transcriptor de audio (Whisper) en un chat nuevo de Claude.
# Uso: bash tools/setup_transcripcion.sh
set -e
pip install -q faster-whisper
python3 -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8'); print('Transcriptor listo')"
