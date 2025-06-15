import os
import json
import shutil
import requests
from pathlib import Path
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse, Response, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.gzip import GZipMiddleware
from modules.image import compress_image_to_jpeg, get_minified_filename

# パスの設定
CURRENT_DIR = Path(__file__).parent
WORKFLOW_PATH = CURRENT_DIR / "dist" / "workflow"
CONFIG_ORG_PATH = CURRENT_DIR / "config.json.org"
CONFIG_PATH = CURRENT_DIR / "config.json"

# デフォルト設定
DEFAULT_CONFIG = {
    "bun_port": 3000,
    "comfyui_endpoint": "http://127.0.0.1:8188"
}

app = FastAPI()
# GZip圧縮を有効化
app.add_middleware(GZipMiddleware, minimum_size=1000)


# 設定ファイルを読み込む
def load_config():
    # 設定ファイルが存在しない場合、.orgファイルをコピーする
    if not CONFIG_PATH.exists() and CONFIG_ORG_PATH.exists():
        shutil.copy(CONFIG_ORG_PATH, CONFIG_PATH)

    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as error:
        print(f"Error loading config.json: {error}")
        return DEFAULT_CONFIG

config = load_config()

# ワークフローファイルの一覧を取得する関数
def get_workflow_list():
    if not WORKFLOW_PATH.exists():
        return []
    
    return [
        f.stem for f in WORKFLOW_PATH.glob("*.json")
    ]

# APIエンドポイント: ComfyUI Endpoint
@app.get("/api/comfyui_endpoint")
async def get_comfyui_endpoint():
    return JSONResponse({"endpoint": config["comfyui_endpoint"]})

# APIエンドポイント: ワークフロー一覧
@app.get("/api/workflows")
async def get_workflows():
    try:
        workflows = get_workflow_list()
        return JSONResponse(workflows)
    except Exception as error:
        print(f"Error getting workflow list: {error}")
        return JSONResponse(
            {"error": "Failed to get workflow list"},
            status_code=500
        )

# ComfyUI ObjectInfo を中継する（zip圧縮を使うため）
@app.get("/api/object_info")
async def get_object_info():
    try:
        response = requests.get(f"{config['comfyui_endpoint']}/object_info")
        response.raise_for_status()
        return JSONResponse(response.json())
    except Exception as error:
        print(f"Error getting object info: {error}")
        return JSONResponse(
            {"error": "Failed to get object info"},
            status_code=500
        )

@app.get("/api/get_image")
async def get_image(filename: str = Query(...), type: str = Query(...)):
    try:
        # タイプによってフォルダを決定
        if type == "temp":
            base_folder = config.get("comfyui_temp_folder", "")
        else:
            base_folder = config.get("comfyui_output_folder", "")
        
        if not base_folder:
            return JSONResponse(
                {"error": f"Folder configuration not found for type: {type}"},
                status_code=500
            )
        
        # 元の画像ファイルのパス
        original_path = Path(base_folder) / filename
        
        if not original_path.exists():
            return Response("Image not found", status_code=404)
        
        # 圧縮後のファイル名を生成
        minified_filename = get_minified_filename(filename)
        minified_path = Path(config.get("comfyui_temp_folder", "")) / minified_filename
        
        # 圧縮済みファイルが存在しない場合は圧縮を実行
        if not minified_path.exists():
            success = compress_image_to_jpeg(str(original_path), str(minified_path), quality=85)
            if not success:
                # 圧縮に失敗した場合は元のファイルを返す
                return FileResponse(original_path, media_type="image/jpeg")
        
        # 圧縮済みファイルを返す
        return FileResponse(minified_path, media_type="image/jpeg")
        
    except Exception as error:
        print(f"Error getting image: {error}")
        return JSONResponse(
            {"error": "Failed to get image"},
            status_code=500
        )


# 静的ファイルの処理
@app.get("/{full_path:path}")
async def serve_static(full_path: str):
    # ルートパスの場合はindex.htmlを返す
    if not full_path or full_path == "/":
        full_path = "index.html"

    file_path = CURRENT_DIR / "dist" / full_path

    if not file_path.exists():
        return Response("Not Found", status_code=404)

    # Content-Typeの設定
    content_type = "text/plain"
    if file_path.suffix == ".html":
        content_type = "text/html; charset=utf-8"
    elif file_path.suffix == ".js":
        content_type = "application/javascript; charset=utf-8"
    elif file_path.suffix == ".json":
        content_type = "application/json; charset=utf-8"
    elif file_path.suffix == ".css":
        content_type = "text/css; charset=utf-8"
    elif file_path.suffix in [".yaml", ".yml"]:
        content_type = "application/yaml; charset=utf-8"

    return FileResponse(file_path, media_type=content_type)

if __name__ == "__main__":
    import uvicorn
    port = config["bun_port"]
    print(f"Listening on http://localhost:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
