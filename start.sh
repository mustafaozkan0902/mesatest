#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=========================================================="
echo "🏗️  MESA Şantiye Elektrik Testi Ön Şart Takip Sistemi Başlatılıyor..."
echo "=========================================================="
/usr/bin/python3 server.py
