from pathlib import Path
from typing import Any


class PromptService:
    def __init__(self):
        self.prompts_dir = Path(__file__).parent.parent / "prompts"

    def get_available_prompts(self) -> list[dict[str, Any]]:
        """
        promptsディレクトリからプロンプトファイル一覧を取得
        """
        prompts = []

        if not self.prompts_dir.exists():
            return prompts

        for file_path in self.prompts_dir.glob("*.txt"):
            name = file_path.stem  # ファイル名から拡張子を除いた部分
            filename = file_path.name

            # ファイルの最初の数行から説明を抽出（コメント行があれば）
            description = self._extract_description(file_path)

            prompts.append(
                {
                    "name": name,
                    "filename": filename,
                    "description": description or f"Prompt: {name}",
                }
            )

        # 名前でソート
        prompts.sort(key=lambda x: x["name"])
        return prompts

    def load_prompt(self, prompt_name: str) -> str | None:
        """
        指定されたプロンプト名のファイル内容を読み込み
        """
        file_path = self.prompts_dir / f"{prompt_name}.txt"

        if not file_path.exists():
            return None

        try:
            with open(file_path, encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            print(f"Error loading prompt {prompt_name}: {e}")
            return None

    def _extract_description(self, file_path: Path) -> str | None:
        """
        プロンプトファイルの最初のコメント行から説明を抽出
        """
        try:
            with open(file_path, encoding="utf-8") as f:
                first_line = f.readline().strip()

                # # で始まるコメント行があれば説明として使用
                if first_line.startswith("#"):
                    return first_line[1:].strip()

                # 最初の文（ピリオドまで）を説明として使用
                first_sentence = first_line.split(".")[0]
                if first_sentence and len(first_sentence) < 100:  # 空文字列でなく、短い場合のみ説明として使用
                    return first_sentence

        except Exception:
            pass

        return None
