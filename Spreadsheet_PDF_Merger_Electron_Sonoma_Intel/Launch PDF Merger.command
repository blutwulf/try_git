#!/bin/bash
set -e
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  echo "Run setup.command first."
  read -p "Press Return to close..."
  exit 1
fi
npm start
