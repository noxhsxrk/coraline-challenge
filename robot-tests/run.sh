#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

mkdir -p robot-tests/results robot-tests/screenshots

pip install -q -r robot-tests/requirements.txt 2>/dev/null || true
python -m Browser.entry init 2>/dev/null || true

echo "Running Robot Framework tests..."
robot \
    --outputdir robot-tests/results \
    --pythonpath robot-tests \
    "$@" \
    robot-tests/tests/
