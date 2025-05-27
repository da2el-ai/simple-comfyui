@echo off

REM venvディレクトリの存在確認
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    echo Installing requirements...
    call venv\Scripts\activate
    pip install -r requirements.txt
) else (
    echo Virtual environment exists.
    call venv\Scripts\activate
)

REM Pythonスクリプトの実行
echo Starting server...
python index.py
