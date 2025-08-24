import pytest
from pathlib import Path
from services.prompt_service import PromptService


@pytest.fixture
def test_prompts_dir(tmp_path):
    """テスト用プロンプトディレクトリを作成"""
    prompts_dir = tmp_path / "prompts"
    prompts_dir.mkdir()
    
    # 多様なテスト用プロンプトファイルを作成
    
    # コメント行があるプロンプト
    (prompts_dir / "comment_prompt.txt").write_text(
        "# コード品質分析プロンプト\nあなたはコード分析のエキスパートです。",
        encoding="utf-8"
    )
    
    # コメント行がないプロンプト
    (prompts_dir / "no_comment_prompt.txt").write_text(
        "This is a simple validation prompt without comment line.",
        encoding="utf-8"
    )
    
    # 長い説明文（100文字以上）
    long_text = "A" * 120 + ". Rest of content."
    (prompts_dir / "long_description_prompt.txt").write_text(
        long_text,
        encoding="utf-8"
    )
    
    # 短い説明文（100文字未満）
    (prompts_dir / "short_description_prompt.txt").write_text(
        "Short description text. More content here.",
        encoding="utf-8"
    )
    
    # 空ファイル
    (prompts_dir / "empty_prompt.txt").write_text("", encoding="utf-8")
    
    # ソートテスト用ファイル（アルファベット順）
    (prompts_dir / "alpha_prompt.txt").write_text(
        "# Alpha prompt\nFirst prompt content.",
        encoding="utf-8"
    )
    
    (prompts_dir / "beta_prompt.txt").write_text(
        "# Beta prompt\nSecond prompt content.",
        encoding="utf-8"
    )
    
    (prompts_dir / "gamma_prompt.txt").write_text(
        "# Gamma prompt\nThird prompt content.",
        encoding="utf-8"
    )
    
    # 拡張子違いのファイル（除外されるべき）
    (prompts_dir / "not_a_prompt.md").write_text(
        "This should be ignored.",
        encoding="utf-8"
    )
    
    return prompts_dir


@pytest.fixture
def empty_prompts_dir(tmp_path):
    """空のプロンプトディレクトリ"""
    prompts_dir = tmp_path / "prompts"
    prompts_dir.mkdir()
    return prompts_dir


@pytest.fixture
def prompt_service(test_prompts_dir):
    """テスト用PromptServiceインスタンス"""
    service = PromptService()
    service.prompts_dir = test_prompts_dir
    return service


@pytest.fixture
def prompt_service_empty(empty_prompts_dir):
    """空ディレクトリ用PromptServiceインスタンス"""
    service = PromptService()
    service.prompts_dir = empty_prompts_dir
    return service


@pytest.fixture
def prompt_service_no_dir():
    """存在しないディレクトリ用PromptServiceインスタンス"""
    service = PromptService()
    service.prompts_dir = Path("/non/existent/directory")
    return service