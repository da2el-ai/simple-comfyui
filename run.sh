#!/bin/bash

# venvディレクトリの存在確認
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "Installing requirements..."
    source venv/bin/activate
    pip install -r requirements.txt
else
    echo "Virtual environment exists."
    source venv/bin/activate
fi

# Pythonスクリプトの実行
echo "Starting server..."
python index.py

# Note: First time setup - run: chmod +x run.sh
