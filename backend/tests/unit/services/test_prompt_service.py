from pathlib import Path

import pytest

from services.prompt_service import PromptService


class TestPromptService:
    """PromptServiceの単体テストクラス"""

    def test_init(self):
        """初期化テスト"""
        service = PromptService()
        assert service.prompts_dir is not None
        assert service.prompts_dir.name == "prompts"

    class TestGetAvailablePrompts:
        """get_available_prompts()メソッドのテスト"""

        def test_with_valid_prompts(self, prompt_service):
            """正常なプロンプトファイルがある場合"""
            prompts = prompt_service.get_available_prompts()

            # 結果の基本検証
            assert isinstance(prompts, list)
            assert len(prompts) == 8  # .txtファイルのみカウント（.mdは除外）

            # すべての要素が正しい構造を持つか
            for prompt in prompts:
                assert "name" in prompt
                assert "filename" in prompt
                assert "description" in prompt

            # ファイル名順にソートされているか
            names = [p["name"] for p in prompts]
            assert names == sorted(names)

            # 特定のプロンプトが含まれているか
            prompt_names = [p["name"] for p in prompts]
            assert "alpha_prompt" in prompt_names
            assert "beta_prompt" in prompt_names
            assert "comment_prompt" in prompt_names

        def test_with_empty_directory(self, prompt_service_empty):
            """空のディレクトリの場合"""
            prompts = prompt_service_empty.get_available_prompts()
            assert prompts == []

        def test_with_nonexistent_directory(self, prompt_service_no_dir):
            """存在しないディレクトリの場合"""
            prompts = prompt_service_no_dir.get_available_prompts()
            assert prompts == []

        def test_excludes_non_txt_files(self, prompt_service):
            """.txt以外のファイルが除外されることを確認"""
            prompts = prompt_service.get_available_prompts()
            prompt_names = [p["name"] for p in prompts]

            # .mdファイルは除外される
            assert "not_a_prompt" not in prompt_names

        def test_description_extraction(self, prompt_service):
            """説明文抽出の動作確認"""
            prompts = prompt_service.get_available_prompts()
            prompts_dict = {p["name"]: p for p in prompts}

            # コメント行がある場合
            comment_prompt = prompts_dict["comment_prompt"]
            assert comment_prompt["description"] == "コード品質分析プロンプト"

            # コメント行がない場合
            no_comment_prompt = prompts_dict["no_comment_prompt"]
            assert (
                no_comment_prompt["description"]
                == "This is a simple validation prompt without comment line"
            )

            # 長い説明文の場合（デフォルト説明を使用）
            long_desc_prompt = prompts_dict["long_description_prompt"]
            assert long_desc_prompt["description"] == "Prompt: long_description_prompt"

    class TestLoadPrompt:
        """load_prompt()メソッドのテスト"""

        def test_load_existing_prompt(self, prompt_service):
            """存在するプロンプトの読み込み"""
            content = prompt_service.load_prompt("comment_prompt")

            assert content is not None
            assert "コード品質分析プロンプト" in content
            assert "あなたはコード分析のエキスパートです。" in content

        def test_load_nonexistent_prompt(self, prompt_service):
            """存在しないプロンプトの読み込み"""
            content = prompt_service.load_prompt("nonexistent_prompt")
            assert content is None

        def test_load_empty_prompt(self, prompt_service):
            """空ファイルの読み込み"""
            content = prompt_service.load_prompt("empty_prompt")
            assert content == ""

        def test_load_prompt_with_io_error(self, prompt_service, mocker):
            """ファイル読み込み例外の処理"""
            # openをモックしてIOErrorを発生させる
            mock_open = mocker.mock_open()
            mock_open.side_effect = IOError("Permission denied")
            mocker.patch("builtins.open", mock_open)

            content = prompt_service.load_prompt("comment_prompt")
            assert content is None

        def test_load_prompt_with_nonexistent_directory(self, prompt_service_no_dir):
            """存在しないディレクトリからの読み込み"""
            content = prompt_service_no_dir.load_prompt("any_prompt")
            assert content is None

    class TestExtractDescription:
        """_extract_description()プライベートメソッドのテスト"""

        def test_extract_comment_description(self, test_prompts_dir):
            """コメント行からの説明抽出"""
            service = PromptService()
            file_path = test_prompts_dir / "comment_prompt.txt"

            description = service._extract_description(file_path)
            assert description == "コード品質分析プロンプト"

        def test_extract_first_sentence_description(self, test_prompts_dir):
            """最初の文からの説明抽出"""
            service = PromptService()
            file_path = test_prompts_dir / "short_description_prompt.txt"

            description = service._extract_description(file_path)
            assert description == "Short description text"

        def test_extract_long_description_returns_none(self, test_prompts_dir):
            """長い説明文の場合はNoneを返す"""
            service = PromptService()
            file_path = test_prompts_dir / "long_description_prompt.txt"

            description = service._extract_description(file_path)
            assert description is None

        def test_extract_empty_file_returns_none(self, test_prompts_dir):
            """空ファイルの場合はNoneを返す"""
            service = PromptService()
            file_path = test_prompts_dir / "empty_prompt.txt"

            description = service._extract_description(file_path)
            assert description is None

        def test_extract_nonexistent_file_returns_none(self):
            """存在しないファイルの場合はNoneを返す"""
            service = PromptService()
            file_path = Path("/nonexistent/file.txt")

            description = service._extract_description(file_path)
            assert description is None

        def test_extract_with_encoding_error(self, test_prompts_dir, mocker):
            """エンコーディングエラーの場合はNoneを返す"""
            service = PromptService()
            file_path = test_prompts_dir / "comment_prompt.txt"

            # openをモックしてUnicodeDecodeErrorを発生させる
            mock_open = mocker.mock_open()
            mock_open.side_effect = UnicodeDecodeError(
                "utf-8", b"", 0, 1, "invalid start byte"
            )
            mocker.patch("builtins.open", mock_open)

            description = service._extract_description(file_path)
            assert description is None

    class TestIntegration:
        """統合的なテスト"""

        def test_end_to_end_workflow(self, prompt_service):
            """エンドツーエンドのワークフローテスト"""
            # 1. プロンプト一覧を取得
            prompts = prompt_service.get_available_prompts()
            assert len(prompts) > 0

            # 2. 最初のプロンプトを読み込み
            first_prompt = prompts[0]
            content = prompt_service.load_prompt(first_prompt["name"])
            assert content is not None

            # 3. 説明文が正しく設定されている
            assert first_prompt["description"] != ""

        def test_sorting_consistency(self, prompt_service):
            """ソート順の一貫性テスト"""
            prompts = prompt_service.get_available_prompts()
            names = [p["name"] for p in prompts]

            # アルファベット順になっている
            assert names[0] == "alpha_prompt"
            assert "alpha_prompt" in names
            assert "beta_prompt" in names
            assert "gamma_prompt" in names

            # ソート順が正しい
            alpha_idx = names.index("alpha_prompt")
            beta_idx = names.index("beta_prompt")
            gamma_idx = names.index("gamma_prompt")
            assert alpha_idx < beta_idx < gamma_idx
