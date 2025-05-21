import { existsSync, readdirSync } from 'fs';
import { join, extname } from 'path';

const WORKFLOW_PATH = join(import.meta.dir, 'dist', 'workflow');
const CONFIG_ORG_PATH = join(import.meta.dir, 'config.json.org');
const CONFIG_PATH = join(import.meta.dir, 'config.json');

// 設定ファイルを読み込む
let config: { bun_port: number; comfyui_endpoint: string };

// 設定ファイルが存在しない場合、.orgファイルをコピーする
if (!existsSync(CONFIG_PATH) && existsSync(CONFIG_ORG_PATH)) {
    await Bun.write(CONFIG_PATH, await Bun.file(CONFIG_ORG_PATH).text());
}

try {
    const configContent = await Bun.file(CONFIG_PATH).text();
    config = JSON.parse(configContent);
} catch (error) {
    console.error('Error loading config.json:', error);
    config = { 
        bun_port: 3000,
        comfyui_endpoint: 'http://127.0.0.1:8188'
    }; // デフォルト値を使用
}

// ワークフローファイルの一覧を取得する関数
function getWorkflowList(): string[] {
    if (!existsSync(WORKFLOW_PATH)) {
        return [];
    }

    const files = readdirSync(WORKFLOW_PATH);
    return files
        .filter(file => extname(file) === '.json')
        .map(file => file.replace('.json', ''));
}

const server = Bun.serve({
    port: config.bun_port,
    async fetch(request) {
        try {
            const url = new URL(request.url);
            let filePath = url.pathname;

            // APIエンドポイント: ComfyUI Endpoint
            if (filePath === '/api/comfyui_endpoint') {
                return new Response(JSON.stringify({ endpoint: config.comfyui_endpoint }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // APIエンドポイント: ワークフロー一覧
            if (filePath === '/api/workflows') {
                const WORKFLOW_PATH = join(import.meta.dir, 'dist', 'workflow');
                try {
                    // ワークフローの一覧を取得
                    const workflows = getWorkflowList();
                    // console.log('Found workflows:', workflows);
                    return new Response(JSON.stringify(workflows), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch (error) {
                    console.error('Error getting workflow list:', error);
                    return new Response(JSON.stringify({ error: 'Failed to get workflow list' }), { 
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }

            // Root path serves index.html
            if (filePath === '/') {
                filePath = '/index.html';
            }

            // Construct the full path relative to the dist directory
            const fullPath = join(import.meta.dir, 'dist', filePath.substring(1)); // Remove leading '/'

            // console.log(`Request for: ${url.pathname}, attempting to serve: ${fullPath}`);

            // Check if the file exists
            if (existsSync(fullPath)) {
                const file = Bun.file(fullPath);
                // Determine content type based on file extension
                let contentType = 'text/plain'; // Default
                if (filePath.endsWith('.html')) {
                    contentType = 'text/html; charset=utf-8';
                } else if (filePath.endsWith('.js')) {
                    contentType = 'application/javascript; charset=utf-8';
                } else if (filePath.endsWith('.json')) {
                    contentType = 'application/json; charset=utf-8';
                } else if (filePath.endsWith('.css')) {
                    contentType = 'text/css; charset=utf-8';
                } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
                    contentType = 'application/yaml; charset=utf-8';
                }

                return new Response(file, {
                    headers: { 'Content-Type': contentType },
                });
            } else {
                console.error(`File not found: ${fullPath}`);
                return new Response("Not Found", { status: 404 });
            }
        } catch (error) {
            console.error("Error during fetch:", error);
            return new Response("Internal Server Error during fetch", { status: 500 });
        }
    },
    error(error) {
        console.error("Server error:", error);
        return new Response("Internal Server Error", { status: 500 });
    },
});

console.log(`Listening on http://localhost:${server.port}`);
