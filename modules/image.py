import os
from pathlib import Path
from PIL import Image, ImageFile
import io

# PILの画像サイズ制限を緩和（decompression bomb対策を無効化）
Image.MAX_IMAGE_PIXELS = None
ImageFile.LOAD_TRUNCATED_IMAGES = True

def compress_image_to_jpeg(input_path: str, output_path: str, quality: int = 85) -> bool:
    """
    画像をJPEG形式で圧縮する
    
    Args:
        input_path: 入力画像のパス
        output_path: 出力画像のパス
        quality: JPEG品質 (1-100)
    
    Returns:
        bool: 成功した場合True、失敗した場合False
    """
    try:
        # 入力ファイルが存在するかチェック
        if not os.path.exists(input_path):
            return False
        
        # 出力ディレクトリを作成
        output_dir = os.path.dirname(output_path)
        os.makedirs(output_dir, exist_ok=True)
        
        # PILで画像を開く
        with Image.open(input_path) as image:
            # RGBAモードの場合はRGBに変換（JPEG保存のため）
            if image.mode in ('RGBA', 'LA', 'P'):
                # 透明度がある場合は白背景で合成
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode in ('RGBA', 'LA') else None)
                image = background
            elif image.mode != 'RGB':
                image = image.convert('RGB')
            
            # JPEG形式で保存
            image.save(output_path, format='JPEG', quality=quality, optimize=True)
        
        return True
        
    except Exception as e:
        print(f"Error compressing image {input_path}: {e}")
        return False

def get_minified_filename(original_filename: str) -> str:
    """
    元のファイル名から圧縮後のファイル名を生成する
    
    Args:
        original_filename: 元のファイル名
    
    Returns:
        str: 圧縮後のファイル名 ({元のファイル名}_minify.{元の拡張子})
    """
    path = Path(original_filename)
    stem = path.stem
    suffix = path.suffix
    return f"{stem}_minify{suffix}"
