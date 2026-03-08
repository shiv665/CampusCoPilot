#!/bin/bash
set -e

cd /home/site/wwwroot

# Install packages into a persistent venv (only if not already done)
if [ ! -f "/home/antenv/bin/activate" ]; then
    echo "=== First run: creating virtual environment ==="
    python -m venv /home/antenv
    source /home/antenv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
else
    source /home/antenv/bin/activate
    # Reinstall if requirements changed
    pip install -r requirements.txt --quiet
fi

echo "=== Starting CampusCoPilot ==="
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
